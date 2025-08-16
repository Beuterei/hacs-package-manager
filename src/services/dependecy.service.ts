import { HacsConfigMapper } from '../mappers/hacsConfig.mapper';
import { type Defaults, type HacsConfig, isRemoteHacsConfig } from '../shared/hacs';
import { type HpmDependencies, type HpmDependency } from '../shared/hpm';
import { constructSubDirectory } from '../util/dependency.helper';
import { getFiles } from '../util/io.helper';
import { CacheService } from './cache.service';
import { AppdaemonDependencyService } from './category-dependency-services/appdaemon-dependency.service';
import { type CategoryDependencyService } from './category-dependency-services/category-dependency-service.interface';
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
import Zip from 'jszip';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

// Define a map of category to dependency service
const categoryToDependencyService: { [key in keyof Defaults]: CategoryDependencyService } = {
    appdaemon: new AppdaemonDependencyService(),
    integration: new IntegrationDependencyService(),
    netdaemon: new NetdaemonDependencyService(),
    plugin: new PluginDependencyService(),
    pythonScript: new PythonScriptDependencyService(),
    template: new TemplateDependencyService(),
    theme: new ThemeDependencyService(),
};

export const categoryBasePaths: { [key in keyof Defaults]: string } = {
    appdaemon: 'appdaemon/apps',
    integration: 'custom_components',
    netdaemon: 'netdaemon/apps',
    plugin: 'www/community',
    pythonScript: 'python_scripts',
    template: 'custom_templates',
    theme: 'themes',
};

export class DependencyService {
    public constructor(
        private cacheService = CacheService.getInstance(),
        private gitHubService = new GitHubService(),
    ) {}

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

        if (hacsConfig.zipRelease && category === 'integration') {
            const zipReleaseDependencyService = new ZipReleaseDependencyService();
            const zipReleaseHpmDependency: HpmDependency = {
                category,
                hacsConfig,
                ref,
                refType,
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
            category,
            hacsConfig,
            ref,
            refType,
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

    public async cleanLocalDependencies(haConfigPath: string, configPath: string): Promise<void> {
        const dependencies = await this.getDependencies(configPath);

        const persistentDirectories: string[] = [];

        for (const [repositorySlug, hpmDependency] of Object.entries(dependencies)) {
            if (
                'persistentDirectory' in hpmDependency.hacsConfig &&
                hpmDependency.hacsConfig.persistentDirectory
            ) {
                // TODO: Use a better method to construct the subdirectory then to use the remoteFiles array
                const subDirectory = constructSubDirectory(
                    repositorySlug,
                    'remoteFiles' in hpmDependency ? hpmDependency.remoteFiles[0] : undefined,
                );

                persistentDirectories.push(
                    `${subDirectory.split('/')[0]}/${hpmDependency.hacsConfig.persistentDirectory}`,
                );
            }
        }

        for (const basePath of Object.values(categoryBasePaths)) {
            if (existsSync(`${haConfigPath}/${basePath}`)) {
                if (basePath === categoryBasePaths.integration) {
                    const files = getFiles(`${haConfigPath}/${basePath}`).filter(
                        (file) =>
                            !persistentDirectories.some((directory) => file.includes(directory)),
                    );

                    // TODO: Handle empty directories that are being left by this method
                    for (const file of files) {
                        rmSync(file);
                    }
                } else {
                    rmSync(`${haConfigPath}/${basePath}`, { recursive: true });
                }
            }
        }
    }

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
                path: 'hacs.json',
                ref,
                repositorySlug,
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
    ): Promise<{ ref: string; refType: 'commit' | 'tag'; resolvedFromDefaultBranch?: true }> {
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
        return { ref: matchedRef.matchedRef, refType: matchedRef.matchedRefType };
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

        if ('remoteFiles' in hpmDependency) {
            for (const file of hpmDependency.remoteFiles) {
                // eslint-disable-next-line @typescript-eslint/no-shadow
                const localDependencyPath = dependencyService.getLocalDependencyPath(
                    categoryBasePaths[hpmDependency.category],
                    haConfigPath,
                    repositorySlug,
                    file,
                );

                mkdirSync(localDependencyPath, { recursive: true });

                const remoteFile = await this.gitHubService.fetchFile({
                    path: file,
                    ref: hpmDependency.ref,
                    repositorySlug,
                });

                await Bun.write(
                    Bun.file(`${localDependencyPath}/${file.split('/').pop()}`),
                    atob(remoteFile.content),
                );
            }

            return;
        }

        const localDependencyPath = dependencyService.getLocalDependencyPath(
            categoryBasePaths[hpmDependency.category],
            haConfigPath,
            repositorySlug,
        );

        mkdirSync(localDependencyPath, { recursive: true });

        if ('releaseUrl' in hpmDependency) {
            if (hpmDependency.hacsConfig.zipRelease) {
                const zipArrayBuffer = await (await fetch(hpmDependency.releaseUrl)).arrayBuffer();

                const zip = await new Zip().loadAsync(zipArrayBuffer);

                for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
                    if (zipEntry.dir) {
                        mkdirSync(`${localDependencyPath}/${relativePath}`, { recursive: true });
                        continue;
                    }

                    const content = await zipEntry.async('arraybuffer');

                    await Bun.write(`${localDependencyPath}/${relativePath}`, content);
                }

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

    public async removeDependency(
        configPath: string,
        haConfigPath: string,
        repositorySlug: string,
    ): Promise<void> {
        const hpmDependencies = await this.readDependenciesFile(configPath);

        if (!hpmDependencies[repositorySlug]) {
            throw new DependencyNotFoundError(repositorySlug);
        }

        // TODO: Remove the local files
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete hpmDependencies[repositorySlug];

        await Bun.write(Bun.file(configPath), JSON.stringify(hpmDependencies, null, 2));
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
