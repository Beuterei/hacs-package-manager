import { HacsConfigMapper } from '../mappers/hacsConfig.mapper';
import { type Defaults, type HacsConfig, isRemoteHacsConfig } from '../shared/hacs';
import type { HpmDependencies, HpmDependency } from '../shared/hpm';
import { CacheService } from './cache.service';
import { DependencyNotFoundError } from './errors/dependencyNotFoundError.exception';
import { InvalidHacsConfigError } from './errors/invalidHacsConfigError.exception';
import { InvalidHpmFileError } from './errors/invalidHpmFileError.exception';
import { GitHubService } from './github.service';

export class DependencyService {
    public async addDependency(
        repositorySlug: string,
        unresolvedRef?: string,
    ): Promise<HpmDependency> {
        const category = await this.getCategory(repositorySlug);

        const { ref, refType, resolvedFromDefaultBranch } = await this.getRefAndType(
            repositorySlug,
            unresolvedRef,
        );

        const hacsConfig = await this.getHacsConfig(repositorySlug, ref);

        if (resolvedFromDefaultBranch && (hacsConfig.hideDefaultBranch || hacsConfig.zipRelease)) {
            throw new Error(
                `The default branch of '${repositorySlug}' is hidden or a zip release is used. Please provide a release tag instead.`,
            );
        }

        const hpmDependency: HpmDependency = {
            ref,
            refType,
            category,
            hacsConfig,
            ...(await this.resolveDependencyFiles(repositorySlug, ref, category, hacsConfig)),
        };

        const dependencyFile = Bun.file('hpm.json');
        let hpmDependencies: HpmDependencies = {};

        if (await dependencyFile.exists()) {
            const parsed = JSON.parse(await dependencyFile.text());

            if (typeof parsed !== 'object' || parsed === null) {
                throw new InvalidHpmFileError();
            }

            hpmDependencies = parsed as HpmDependencies;
        }

        hpmDependencies[repositorySlug] = hpmDependency;

        await Bun.write(dependencyFile, JSON.stringify(hpmDependencies, null, 2));

        return hpmDependency;
    }

    public constructor(
        private cacheService = CacheService.getInstance(),
        private gitHubService = new GitHubService(),
    ) {}

    public async getCategory(repositorySlug: string): Promise<keyof Defaults> {
        const defaultsCache = await this.cacheService.getDefaultsCache();

        for (const [key, value] of Object.entries(defaultsCache.defaults)) {
            if (Array.isArray(value) && value.includes(repositorySlug)) {
                return key as keyof Defaults;
            }
        }

        throw new DependencyNotFoundError(repositorySlug);
    }

    public async getHacsConfig(repositorySlug: string, ref: string): Promise<HacsConfig> {
        const hacsConfigResponse = await this.gitHubService.fetchFile({
            repositorySlug,
            path: 'hacs.json',
            ref,
        });

        const parsedHacsConfig = JSON.parse(atob(hacsConfigResponse.content));

        if (!isRemoteHacsConfig(parsedHacsConfig)) {
            throw new InvalidHacsConfigError(repositorySlug, ref);
        }

        return new HacsConfigMapper().mapRemoteHacsConfigToHacsConfig(parsedHacsConfig);
    }

    public async getRefAndType(
        repositorySlug: string,
        unresolvedRef?: string,
    ): Promise<{ ref: string; refType: 'tag' | 'commit'; resolvedFromDefaultBranch?: true }> {
        if (!unresolvedRef) {
            return {
                ref: await this.gitHubService.fetchLatestCommit(repositorySlug),
                refType: 'commit',
                resolvedFromDefaultBranch: true, // Indicate that the ref was resolved from the default branch and not just a provided commit hash
            };
        }

        const matchedRef = await this.gitHubService.matchRef({ repositorySlug, unresolvedRef });
        if (matchedRef.matchedRefType === 'head') {
            return {
                ref: await this.gitHubService.fetchLatestCommit(repositorySlug),
                refType: 'commit',
            };
        }

        return { refType: matchedRef.matchedRefType, ref: matchedRef.matchedRef };
    }

    public async resolveDependencyFiles(
        repositorySlug: string,
        ref: string,
        category: HpmDependency['category'],
        hacsConfig: HpmDependency['hacsConfig'],
    ): Promise<{ files: string[] } | { releaseUrl: string }> {
        if (hacsConfig.zipRelease) {
            const releaseFileName = hacsConfig.filename;

            if (!releaseFileName) {
                throw new Error('No release file found.');
            }

            const releaseUrl = (
                await this.gitHubService.fetchReleaseArtifact({
                    repositorySlug,
                    path: releaseFileName,
                    ref,
                })
            ).browser_download_url;

            return { releaseUrl };
        }

        if (category === 'appdaemon') {
            const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
                repositorySlug,
                ref,
                path: hacsConfig.contentInRoot ? '' : 'apps',
            });

            if (directoryListResponse.length === 0) {
                throw new Error('No apps files found.');
            }

            return { files: directoryListResponse };
        }

        if (category === 'integration') {
            throw new Error('Not implemented.');
            // TODO: Implement
            // TODO: content_in_root
            // TODO: repository.json?
            // TODO: manifest.json
        }

        if (category === 'netdaemon') {
            const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
                repositorySlug,
                ref,
                path: hacsConfig.contentInRoot ? '' : 'apps',
            });

            if (directoryListResponse.length === 0) {
                throw new Error('No apps files found.');
            }

            return { files: directoryListResponse };
        }

        if (category === 'plugin') {
            throw new Error('Not implemented.');
            // TODO: Implement
            // TODO: release
            // TODO: or filename
            // f"{self.data.name.replace('lovelace-', '')}.js",
            // f"{self.data.name}.js",
            // f"{self.data.name}.umd.js",
            // f"{self.data.name}-bundle.js",
            // TODO: content_in_root
        }

        if (category === 'pythonScript') {
            const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
                repositorySlug,
                ref,
                path: hacsConfig.contentInRoot ? '' : 'python_scripts',
            });

            if (directoryListResponse.length === 0) {
                throw new Error('No python scripts found.');
            }

            return { files: directoryListResponse };
        }

        if (category === 'template') {
            const filename = hacsConfig.filename;

            if (!filename) {
                throw new Error('No template files found.');
            }

            const jinjaFile = await this.gitHubService.fetchFile({
                repositorySlug,
                path: filename,
                ref,
            });

            return { files: [jinjaFile.path] };
        }

        if (category === 'theme') {
            const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
                repositorySlug,
                ref,
                path: 'themes',
            });

            if (directoryListResponse.length === 0) {
                throw new Error('No theme files found.');
            }

            return { files: directoryListResponse };
        }

        throw new Error('Invalid category.');
    }
}
