import type { Defaults } from '../shared/hacs';
import { parseJsonToStringArray } from '../util/json.helper';
import { GitHubService } from './github.service';
import { mkdir } from 'fs/promises';
import { unlink } from 'node:fs/promises';

export interface DefaultsCache {
    defaults: Defaults;
    timestamp: string;
}

const defaultsRepoFilePathMap: { [key in keyof Defaults]: string } = {
    appdaemon: 'appdaemon',
    integration: 'integration',
    netdaemon: 'netdaemon',
    plugin: 'plugin',
    pythonScript: 'python_script',
    template: 'template',
    theme: 'theme',
};

export const isDefaultsCache = (object: unknown): object is DefaultsCache =>
    typeof object === 'object' &&
    object !== null &&
    'timestamp' in object &&
    'defaults' in object &&
    typeof object.defaults === 'object' &&
    object.defaults !== null &&
    Object.keys(defaultsRepoFilePathMap).every(key => key in (object.defaults as object));

export class CacheService {
    private readonly cachePath: string;

    private constructor(private gitHubService = new GitHubService()) {
        const cacheDirectoryName = '.hpm';
        this.cachePath =
            process.platform === 'win32'
                ? `${Bun.env.APPDATA}\\${cacheDirectoryName}\\`
                : `${Bun.env.HOME}/${cacheDirectoryName}/`;
    }

    private async createDefaultsCache(): Promise<void> {
        const cacheFile = this.cachePath + this.defaultsCacheFileName;
        await this.ensureCachePath();

        const defaults = await Promise.all([
            this.fetchDefault('appdaemon'),
            this.fetchDefault('integration'),
            this.fetchDefault('netdaemon'),
            this.fetchDefault('plugin'),
            this.fetchDefault('pythonScript'),
            this.fetchDefault('template'),
            this.fetchDefault('theme'),
        ]);

        const cache: DefaultsCache = {
            timestamp: new Date().toISOString(),
            defaults: {
                appdaemon: defaults[0],
                integration: defaults[1],
                netdaemon: defaults[2],
                plugin: defaults[3],
                pythonScript: defaults[4],
                template: defaults[5],
                theme: defaults[6],
            },
        };

        await Bun.write(cacheFile, JSON.stringify(cache));

        this.defaultsCache = cache;
    }

    private defaultsCache?: DefaultsCache;

    private defaultsCacheFileName = 'defaults.json';

    private async ensureCachePath(): Promise<void> {
        await mkdir(this.cachePath, { recursive: true });
    }

    private async fetchDefault(uriMapKey: keyof Defaults): Promise<string[]> {
        const response = await this.gitHubService.fetchFile({
            repositorySlug: 'hacs/default',
            path: defaultsRepoFilePathMap[uriMapKey],
        });
        return parseJsonToStringArray(atob(response.content));
    }

    public async getDefaultsCache(): Promise<DefaultsCache> {
        const maxCacheAge = 24 * 60 * 60 * 1_000; // 24 hour in milliseconds
        const cacheFilePath = this.cachePath + this.defaultsCacheFileName;

        if (this.defaultsCache) {
            if (Date.now() - new Date(this.defaultsCache.timestamp).getTime() < maxCacheAge) {
                return this.defaultsCache;
            }

            // It is outdated
            await unlink(cacheFilePath);
        }

        const cacheFile = Bun.file(cacheFilePath);

        if (await cacheFile.exists()) {
            const cache = JSON.parse(await cacheFile.text()) as unknown;
            if (
                isDefaultsCache(cache) &&
                Date.now() - new Date(cache.timestamp).getTime() < maxCacheAge
            ) {
                this.defaultsCache = cache;

                return this.defaultsCache;
            }

            // Assume it is outdated, vaulty or outdated structure
            await unlink(cacheFilePath);
        }

        await this.createDefaultsCache();

        return this.defaultsCache as unknown as DefaultsCache;
    }

    public static getInstance = (): CacheService => {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }

        return CacheService.instance;
    };

    private static instance: CacheService;
}
