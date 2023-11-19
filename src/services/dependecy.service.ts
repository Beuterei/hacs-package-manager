import { HacsConfigMapper } from '../mappers/hacsConfig.mapper';
import { type HacsConfig, isRemoteHacsConfig } from '../shared/hacs';
import type { HpmDependencies, HpmDependency } from '../shared/hpm';
import { CacheService } from './cache.service';
import { DependencyNotFoundError } from './errors/dependencyNotFoundError.exception';
import { InvalidHacsConfigError } from './errors/invalidHacsConfigError.exception';
import { InvalidHpmFileError } from './errors/invalidHpmFileError.exception';
import { GitHubService } from './github.service';

export class DependencyService {
    public async addDependency(
        repositorySlug: string,
        hpmDependency: HpmDependency,
    ): Promise<void> {
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
    }

    public constructor(
        private cacheService = CacheService.getInstance(),
        private gitHubService = new GitHubService(),
    ) {}

    public async getDefaultsType(repositorySlug: string): Promise<string> {
        const defaultsCache = await this.cacheService.getDefaultsCache();

        for (const [key, value] of Object.entries(defaultsCache.defaults)) {
            if (Array.isArray(value) && value.includes(repositorySlug)) {
                return key;
            }
        }

        throw new DependencyNotFoundError(repositorySlug);
    }

    public async getHacsConfig(repositorySlug: string, ref: string): Promise<HacsConfig> {
        // TODO: Handle not found error
        const hacsConfigResponse = await this.gitHubService.fetchFile(
            repositorySlug,
            'hacs.json',
            ref,
        );

        const parsedHacsConfig = JSON.parse(atob(hacsConfigResponse.content));

        if (!isRemoteHacsConfig(parsedHacsConfig)) {
            throw new InvalidHacsConfigError(repositorySlug);
        }

        return new HacsConfigMapper().mapRemoteHacsConfigToHacsConfig(parsedHacsConfig);
    }

    public async getRefAndType(
        repositorySlug: string,
        unresolvedRef?: string,
    ): Promise<{ ref: string; refType: 'tag' | 'commit' }> {
        if (!unresolvedRef) {
            return {
                ref: await this.gitHubService.fetchLatestCommit(repositorySlug),
                refType: 'commit',
            };
        }

        const matchedRef = await this.gitHubService.matchRef(repositorySlug, unresolvedRef);
        if (matchedRef.matchedRefType === 'head') {
            return {
                ref: await this.gitHubService.fetchLatestCommit(repositorySlug),
                refType: 'commit',
            };
        }

        return { refType: matchedRef.matchedRefType, ref: matchedRef.matchedRef };
    }
}
