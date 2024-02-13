import { HacsConfigMapper } from '../mappers/hacsConfig.mapper';
import { type Defaults, type HacsConfig, isRemoteHacsConfig } from '../shared/hacs';
import type { HpmDependencies, HpmDependency } from '../shared/hpm';
import { CacheService } from './cache.service';
import { DependencyNotFoundError } from './errors/dependencyNotFoundError.exception';
import { HiddenDefaultBranchOrZipReleaseError } from './errors/hiddenDefaultBranchOrZipReleaseError.exception';
import { InvalidCategoryError } from './errors/invalidCategoryError.exception';
import { InvalidHacsConfigError } from './errors/invalidHacsConfigError.exception';
import { InvalidHpmFileError } from './errors/invalidHpmFileError.exception';
import { NoCategoryFilesFoundError } from './errors/noCategoryFilesFoundError.exception';
import { NoReleaseFileSpecifiedError } from './errors/noReleaseFileSpecifiedError.exception';
import { GitHubService } from './github.service';
import { $ } from 'bun';

export class DependencyService {
    public async addDependency(
        configPath: string,
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
            throw new HiddenDefaultBranchOrZipReleaseError(repositorySlug, ref);
        }

        const hpmDependency: HpmDependency = {
            ref,
            refType,
            category,
            hacsConfig,
            ...(await this.resolveDependencyFiles(repositorySlug, ref, category, hacsConfig)),
        };

        const dependencyFile = Bun.file(configPath);
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

    public async constructLocalDependencyPath(
        haConfigPath: string,
        repositorySlug: string,
        hpmDependency: HpmDependency,
    ): Promise<string> {
        const { category } = hpmDependency;

        const repoName = repositorySlug.split('/')[1];

        if (category === 'appdaemon') {
            return `${haConfigPath}/appdaemon/apps/${repoName}/`;
        }

        // TODO: fix path
        if (category === 'integration') {
            throw new Error('Not implemented.');
            return `${haConfigPath}/custom_components/`;
        }

        // TODO: fix path
        if (category === 'netdaemon') {
            throw new Error('Not implemented.');
            return `${haConfigPath}/netdaemon/apps/`;
        }

        if (category === 'plugin') {
            return `${haConfigPath}/www/community/`;
        }

        if (category === 'pythonScript') {
            return `${haConfigPath}/python_scripts/`;
        }

        if (category === 'template') {
            return `${haConfigPath}/custom_templates/`;
        }

        if (category === 'theme') {
            return `${haConfigPath}/themes/`;
        }

        throw new InvalidCategoryError(repositorySlug, hpmDependency.ref, category);
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

    public async getDependencies(configPath: string): Promise<HpmDependencies> {
        const dependencyFile = Bun.file(configPath);

        if (!(await dependencyFile.exists())) {
            throw new InvalidHpmFileError();
        }

        const parsed = JSON.parse(await dependencyFile.text());

        if (typeof parsed !== 'object' || parsed === null) {
            throw new InvalidHpmFileError();
        }

        return parsed as HpmDependencies;
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

    public async installDependency(
        configPath: string,
        haConfigPath: string,
        repositorySlug: string,
    ): Promise<void> {
        const dependencyFile = Bun.file(configPath);

        if (!(await dependencyFile.exists())) {
            throw new InvalidHpmFileError();
        }

        const parsed = JSON.parse(await dependencyFile.text());

        if (typeof parsed !== 'object' || parsed === null) {
            throw new InvalidHpmFileError();
        }

        const hpmDependencies = parsed as HpmDependencies;

        const hpmDependency = hpmDependencies[repositorySlug];

        if (!hpmDependency) {
            throw new DependencyNotFoundError(repositorySlug);
        }

        const localDependencyPath = await this.constructLocalDependencyPath(
            haConfigPath,
            repositorySlug,
            hpmDependency,
        );

        if ('files' in hpmDependency) {
            for (const file of hpmDependency.files) {
                const fileContent = await this.gitHubService.fetchFile({
                    repositorySlug,
                    path: file,
                    ref: hpmDependency.ref,
                });

                const localFile = Bun.file(`${localDependencyPath}/${file.split('/').pop()}`);

                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                await $`mkdir -p ${localDependencyPath}`;

                await Bun.write(localFile, atob(fileContent.content));
            }

            return;
        }

        throw new Error('Not implemented.');
    }

    // eslint-disable-next-line complexity
    public async resolveDependencyFiles(
        repositorySlug: string,
        ref: string,
        category: HpmDependency['category'],
        hacsConfig: HpmDependency['hacsConfig'],
    ): Promise<{ files: string[] } | { releaseUrl: string }> {
        if (hacsConfig.zipRelease) {
            const releaseFileName = hacsConfig.filename;

            if (!releaseFileName) {
                throw new NoReleaseFileSpecifiedError(repositorySlug, ref);
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
                path: 'apps',
            });

            if (directoryListResponse.length === 0) {
                throw new NoCategoryFilesFoundError(repositorySlug, ref, category);
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
                path:
                    typeof hacsConfig.contentInRoot === 'boolean'
                        ? hacsConfig.contentInRoot
                            ? ''
                            : 'apps'
                        : '',
            });

            const filteredDirectoryListResponse = directoryListResponse.filter(file =>
                file.endsWith('.cs'),
            );

            if (filteredDirectoryListResponse.length === 0) {
                throw new NoCategoryFilesFoundError(repositorySlug, ref, category);
            }

            return { files: filteredDirectoryListResponse };
        }

        if (category === 'plugin') {
            // TODO: check files in releases
            const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
                repositorySlug,
                ref,
                path:
                    typeof hacsConfig.contentInRoot === 'boolean'
                        ? hacsConfig.contentInRoot
                            ? ''
                            : 'dist'
                        : '',
            });

            const filteredDirectoryListResponse = directoryListResponse.filter(file => {
                const fileName = file.split('/').pop();
                const repoName = repositorySlug.split('/')[1];
                return (
                    fileName === hacsConfig.filename ||
                    fileName === `${repoName}.js` ||
                    fileName === `${repoName}.umd.js` ||
                    fileName === `${repoName}-bundle.js` ||
                    fileName === `${repoName.replace('lovelace-', '')}.js`
                );
            });

            if (filteredDirectoryListResponse.length === 0) {
                throw new NoCategoryFilesFoundError(repositorySlug, ref, category);
            }

            return { files: filteredDirectoryListResponse };
        }

        if (category === 'pythonScript') {
            const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
                repositorySlug,
                ref,
                path:
                    typeof hacsConfig.contentInRoot === 'boolean'
                        ? hacsConfig.contentInRoot
                            ? ''
                            : 'python_scripts'
                        : '',
            });

            const filteredDirectoryListResponse = directoryListResponse.filter(file =>
                file.endsWith('.py'),
            );

            if (filteredDirectoryListResponse.length === 0) {
                throw new NoCategoryFilesFoundError(repositorySlug, ref, category);
            }

            return { files: filteredDirectoryListResponse };
        }

        // TODO: Check if i need to carry the validation
        if (category === 'template') {
            const filename = hacsConfig.filename;

            if (!filename) {
                throw new NoCategoryFilesFoundError(repositorySlug, ref, category);
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

            const filteredDirectoryListResponse = directoryListResponse.filter(file =>
                file.endsWith('.yaml'),
            );

            if (filteredDirectoryListResponse.length === 0) {
                throw new NoCategoryFilesFoundError(repositorySlug, ref, category);
            }

            return { files: filteredDirectoryListResponse };
        }

        throw new InvalidCategoryError(repositorySlug, ref, category);
    }
}
