import { HacsConfigMapper } from '../mappers/hacsConfig.mapper';
import { type Defaults, type HacsConfig, isRemoteHacsConfig } from '../shared/hacs';
import type { HpmDependencies, HpmDependency } from '../shared/hpm';
import { CacheService } from './cache.service';
import { AppdaemonDependencyService } from './category-dependency-services/appdaemon-dependency.service';
import type { CategoryDependencyService } from './category-dependency-services/category-dependency-service.interface';
import { IntegrationDependencyService } from './category-dependency-services/integration-dependency.service';
import { NetdaemonDependencyService } from './category-dependency-services/netdaemon-dependency.service';
import { PluginDependencyService } from './category-dependency-services/plugin-dependency.service';
import { PythonScriptDependencyService } from './category-dependency-services/python-script-dependency.service';
import { TemplateDependencyService } from './category-dependency-services/template-dependency.service';
import { ThemeDependencyService } from './category-dependency-services/theme-dependency.service';
import { ZipReleaseDependencyService } from './category-dependency-services/zip-release-dependency.service';
import { DependencyNotFoundError } from './errors/dependency-not-found-error.exception';
import { HiddenDefaultBranchOrZipReleaseError } from './errors/hidden-default-branch-or-zip-release-error.exception';
import { HttpExceptionError } from './errors/http-exception-error.exception';
import { InvalidCategoryError } from './errors/invalid-category-error.exception';
import { InvalidHacsConfigError } from './errors/invalid-hacs-config-error.exception';
import { InvalidHpmFileError } from './errors/invalid-hpm-file-error.exception';
import { GitHubService } from './github.service';
import { $ } from 'bun';

// Define a map of category to dependency service
const categoryToDependencyService: { [key in keyof Defaults]: CategoryDependencyService } = {
    appdaemon: new AppdaemonDependencyService(),
    integration: new IntegrationDependencyService(),
    netdaemon: new NetdaemonDependencyService(),
    // TODO: Handle case when not in root and release file
    plugin: new PluginDependencyService(),
    pythonScript: new PythonScriptDependencyService(),
    template: new TemplateDependencyService(),
    theme: new ThemeDependencyService(),
};

export class DependencyService {
    public async addDependency(
        configPath: string,
        repositorySlug: string,
        unresolvedRef?: string,
    ): Promise<HpmDependency> {
        const category = await this.getCategory(repositorySlug);

        // Check if the category exists in the map
        if (!Object.prototype.hasOwnProperty.call(categoryToDependencyService, category)) {
            throw new InvalidCategoryError(repositorySlug, category, unresolvedRef);
        }

        // Get the appropriate dependency service based on the category
        const dependencyService = categoryToDependencyService[category];

        const { ref, refType, resolvedFromDefaultBranch } = await this.getRefAndType(
            repositorySlug,
            unresolvedRef,
        );

        const hacsConfig = await this.getHacsConfig(repositorySlug, ref);

        if (resolvedFromDefaultBranch && (hacsConfig.hideDefaultBranch || hacsConfig.zipRelease)) {
            throw new HiddenDefaultBranchOrZipReleaseError(repositorySlug, ref);
        }

        if (hacsConfig.zipRelease) {
            const zipReleaseDependencyService = new ZipReleaseDependencyService();
            const zipReleaseHpmDependency: HpmDependency = {
                ref,
                refType,
                category,
                hacsConfig,
                ...(await zipReleaseDependencyService.resolveDependencyArtifacts(
                    repositorySlug,
                    ref,
                    refType,
                    hacsConfig,
                )),
            };

            await this.writeDependency(configPath, repositorySlug, zipReleaseHpmDependency);

            return zipReleaseHpmDependency;
        }

        const hpmDependency: HpmDependency = {
            ref,
            refType,
            category,
            hacsConfig,
            ...(await dependencyService.resolveDependencyArtifacts(
                repositorySlug,
                ref,
                refType,
                hacsConfig,
            )),
        };

        await this.writeDependency(configPath, repositorySlug, hpmDependency);

        return hpmDependency;
    }

    public static constructSubDirectory = (repositorySlug: string, remoteFile?: string): string => {
        if (remoteFile) {
            const remoteFileParts = remoteFile
                .split('/')
                .filter(part => part !== 'apps')
                .slice(0, -1);
            if (remoteFileParts.length >= 1) {
                return remoteFileParts.join('/');
            }
        }

        return repositorySlug.split('/')[1];
    };

    public constructor(
        private cacheService = CacheService.getInstance(),
        private gitHubService = new GitHubService(),
    ) {}

    public async getCategory(repositorySlug: string): Promise<keyof Defaults> {
        const defaultsCache = await this.cacheService.getDefaultsCache();

        const category = Object.entries(defaultsCache.defaults).find(
            ([, value]) => Array.isArray(value) && value.includes(repositorySlug),
        );

        if (category) {
            return category[0] as keyof Defaults;
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
        let parsedHacsConfig;

        try {
            const hacsConfigResponse = await this.gitHubService.fetchFile({
                repositorySlug,
                path: 'hacs.json',
                ref,
            });
            parsedHacsConfig = JSON.parse(atob(hacsConfigResponse.content));
        } catch (error) {
            if (error instanceof HttpExceptionError && error.status === 404) {
                parsedHacsConfig = {};
            } else {
                throw error;
            }
        }

        if (!isRemoteHacsConfig(parsedHacsConfig)) {
            throw new InvalidHacsConfigError(repositorySlug, ref);
        }

        return new HacsConfigMapper().mapRemoteHacsConfigToHacsConfig(parsedHacsConfig);
    }

    // This function is used to get the reference and type of a repository.
    // It takes a repository slug and an optional unresolved reference as parameters.
    // It returns a promise that resolves to an object containing the reference, its type, and a flag indicating if it was resolved from the default branch.
    public async getRefAndType(
        repositorySlug: string,
        unresolvedRef?: string,
    ): Promise<{ ref: string; refType: 'tag' | 'commit'; resolvedFromDefaultBranch?: true }> {
        // If the unresolved reference is not provided
        if (!unresolvedRef) {
            // Check if the repository has any releases
            if (await this.gitHubService.checkIfReleasesExist(repositorySlug)) {
                // If it does, return the latest release tag and its type
                return {
                    ref: await this.gitHubService.fetchLatestReleaseTag(repositorySlug),
                    refType: 'tag',
                };
            }

            // If the repository does not have any releases, return the latest commit and its type
            // Also, set the flag indicating that the reference was resolved from the default branch
            return {
                ref: await this.gitHubService.fetchLatestCommit(repositorySlug),
                refType: 'commit',
                resolvedFromDefaultBranch: true, // Indicate that the ref was resolved from the default branch and not just a provided commit hash
            };
        }

        // If the unresolved reference is provided, match it with the repository's references
        const matchedRef = await this.gitHubService.matchRef({ repositorySlug, unresolvedRef });

        // If the matched reference is a head
        if (matchedRef.matchedRefType === 'head') {
            // Return the latest commit and its type
            return {
                ref: await this.gitHubService.fetchLatestCommit(repositorySlug),
                refType: 'commit',
            };
        }

        // If the matched reference is not a head, return the matched reference and its type
        return { refType: matchedRef.matchedRefType, ref: matchedRef.matchedRef };
    }

    public async installDependency(
        configPath: string,
        haConfigPath: string,
        repositorySlug: string,
    ): Promise<void> {
        const hpmDependency = (await this.readDependenciesFile(configPath))[repositorySlug];

        if (!hpmDependency) {
            throw new DependencyNotFoundError(repositorySlug);
        }

        const dependencyService = categoryToDependencyService[hpmDependency.category];

        if ('files' in hpmDependency) {
            for (const file of hpmDependency.files) {
                // eslint-disable-next-line @typescript-eslint/no-shadow
                const localDependencyPath = dependencyService.getLocalDependencyPath(
                    haConfigPath,
                    repositorySlug,
                    file,
                );

                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                await $`mkdir -p ${localDependencyPath}`;

                const remoteFile = await this.gitHubService.fetchFile({
                    repositorySlug,
                    path: file,
                    ref: hpmDependency.ref,
                });

                await Bun.write(
                    Bun.file(`${localDependencyPath}/${file.split('/').pop()}`),
                    atob(remoteFile.content),
                );
            }

            return;
        }

        const localDependencyPath = dependencyService.getLocalDependencyPath(
            haConfigPath,
            repositorySlug,
        );

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        await $`mkdir -p ${localDependencyPath}`;

        if ('releaseUrl' in hpmDependency) {
            if (hpmDependency.hacsConfig.zipRelease) {
                const cachePath = await this.cacheService.getCachePath();

                const zipArrayBuffer = await (await fetch(hpmDependency.releaseUrl)).arrayBuffer();

                const zipFile = Bun.file(
                    `${cachePath}/${hpmDependency.releaseUrl.split('/').pop()}`,
                );

                await Bun.write(zipFile, zipArrayBuffer);

                await $`unzip -o ${zipFile} -d ${localDependencyPath}`.quiet();

                await $`rm -rf ${zipFile}`;

                return;
            }

            await Bun.write(
                Bun.file(`${localDependencyPath}/${hpmDependency.releaseUrl.split('/').pop()}`),
                await (await fetch(hpmDependency.releaseUrl)).arrayBuffer(),
            );

            return;
        }

        throw new InvalidHpmFileError();
    }

    public async readDependenciesFile(configPath: string): Promise<HpmDependencies> {
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

    public async writeDependency(
        configPath: string,
        repositorySlug: string,
        hpmDependency: HpmDependency,
    ): Promise<void> {
        const dependencyFile = Bun.file(configPath);

        let hpmDependencies: HpmDependencies = {};

        if (await dependencyFile.exists()) {
            hpmDependencies = await this.readDependenciesFile(configPath);
        }

        hpmDependencies[repositorySlug] = hpmDependency;

        await Bun.write(dependencyFile, JSON.stringify(hpmDependencies, null, 2));
    }
}
