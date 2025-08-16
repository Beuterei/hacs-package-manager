// Importing necessary modules and types
import { type Defaults } from '../shared/hacs';
import { parseJsonToStringArray } from '../util/json.helper';
import { GitHubService } from './github.service';
import { mkdir } from 'fs/promises';
import { unlink } from 'node:fs/promises';

// Defining the DefaultsCache interface
export interface DefaultsCache {
    defaults: Defaults;
    timestamp: string;
}

// Mapping the keys of Defaults to file paths
const defaultsRepoFilePathMap: { [key in keyof Defaults]: string } = {
    appdaemon: 'appdaemon',
    integration: 'integration',
    netdaemon: 'netdaemon',
    plugin: 'plugin',
    pythonScript: 'python_script',
    template: 'template',
    theme: 'theme',
};

// Type guard for DefaultsCache
export const isDefaultsCache = (object: unknown): object is DefaultsCache =>
    typeof object === 'object' &&
    object !== null &&
    'timestamp' in object &&
    'defaults' in object &&
    typeof object.defaults === 'object' &&
    object.defaults !== null &&
    Object.keys(defaultsRepoFilePathMap).every((key) => key in (object.defaults as object));

// Defining the CacheService class
export class CacheService {
    // Property to store the CacheService instance
    private static instance: CacheService;

    private readonly cachePath: string;

    // Property to store the defaults cache
    private defaultsCache?: DefaultsCache;

    // Property for the defaults cache file name
    private defaultsCacheFileName = 'defaults.json';

    // Constructor for the CacheService class
    private constructor(private gitHubService = new GitHubService()) {
        const cacheDirectoryName = '.hpm';
        this.cachePath =
            process.platform === 'win32'
                ? `${Bun.env.APPDATA}\\${cacheDirectoryName}\\`
                : `${Bun.env.HOME}/${cacheDirectoryName}/`;
    }

    // Method to get an instance of CacheService
    public static getInstance = (): CacheService => {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }

        return CacheService.instance;
    };

    public async getCachePath() {
        await this.ensureCachePath();
        return this.cachePath;
    }

    // Method to get the defaults cache
    public async getDefaultsCache(): Promise<DefaultsCache> {
        const maxCacheAge = 24 * 60 * 60 * 1_000; // 24 hours in milliseconds
        const cacheFilePath = this.cachePath + this.defaultsCacheFileName;

        // If the cache exists and is not outdated, return it
        if (this.defaultsCache) {
            if (Date.now() - new Date(this.defaultsCache.timestamp).getTime() < maxCacheAge) {
                return this.defaultsCache;
            }

            // If the cache is outdated, delete it
            await unlink(cacheFilePath);
        }

        const cacheFile = Bun.file(cacheFilePath);

        // If the cache file exists
        if (await cacheFile.exists()) {
            const cache = JSON.parse(await cacheFile.text()) as unknown;
            // If the cache is valid and not outdated, return it
            if (
                isDefaultsCache(cache) &&
                Date.now() - new Date(cache.timestamp).getTime() < maxCacheAge
            ) {
                this.defaultsCache = cache;

                return this.defaultsCache;
            }

            // If the cache is invalid or outdated, delete it
            await unlink(cacheFilePath);
        }

        // Create a new cache
        await this.createDefaultsCache();

        return this.defaultsCache as unknown as DefaultsCache;
    }

    // Method to create a defaults cache
    private async createDefaultsCache(): Promise<void> {
        const cacheFile = this.cachePath + this.defaultsCacheFileName;
        await this.ensureCachePath();

        // Fetching the defaults
        const defaults = await Promise.all([
            this.fetchDefault('appdaemon'),
            this.fetchDefault('integration'),
            this.fetchDefault('netdaemon'),
            this.fetchDefault('plugin'),
            this.fetchDefault('pythonScript'),
            this.fetchDefault('template'),
            this.fetchDefault('theme'),
        ]);

        // Creating the cache
        const cache: DefaultsCache = {
            defaults: {
                appdaemon: defaults[0],
                integration: defaults[1],
                netdaemon: defaults[2],
                plugin: defaults[3],
                pythonScript: defaults[4],
                template: defaults[5],
                theme: defaults[6],
            },
            timestamp: new Date().toISOString(),
        };

        // Writing the cache to a file
        await Bun.write(cacheFile, JSON.stringify(cache));

        this.defaultsCache = cache;
    }

    // Method to ensure the cache path exists
    private async ensureCachePath(): Promise<void> {
        await mkdir(this.cachePath, { recursive: true });
    }

    // Method to fetch a default
    private async fetchDefault(uriMapKey: keyof Defaults): Promise<string[]> {
        const response = await this.gitHubService.fetchFile({
            path: defaultsRepoFilePathMap[uriMapKey],
            repositorySlug: 'hacs/default',
        });
        return parseJsonToStringArray(atob(response.content));
    }
}
