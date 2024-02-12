// Importing necessary modules and types
import { InvalidHpmrcFileError } from './errors/invalidHpmrcFileError.exception';
import type { BunFile } from 'bun';

// Define the keys that are valid for runtime configuration
const runtimeConfigurationKeys: Array<keyof RuntimeConfiguration> = ['gitHubToken'];

// Type guard to check if a key is a valid runtime configuration key
export const isRuntimeConfigurationKey = (key: unknown): key is keyof RuntimeConfiguration =>
    typeof key === 'string' && runtimeConfigurationKeys.includes(key as keyof RuntimeConfiguration);

// Interface for the runtime configuration
export interface RuntimeConfiguration {
    gitHubToken?: string; // GitHub token for authentication
}

// Type guard to check if an object is a valid runtime configuration
export const isRuntimeConfiguration = (object: unknown): object is RuntimeConfiguration =>
    typeof object === 'object' &&
    object !== null &&
    ('gitHubToken' in object ? typeof object.gitHubToken === 'string' : true);

// Class for managing the runtime configuration
export class RuntimeConfigurationService {
    // Private constructor to enforce singleton pattern
    private constructor() {
        const hpmRuntimeConfigurationFileName = '.hpmrc';
        // Determine the path of the runtime configuration file based on the platform
        this.runtimeConfigurationFile = Bun.file(
            process.platform === 'win32'
                ? `${Bun.env.APPDATA}\\${hpmRuntimeConfigurationFileName}`
                : `${Bun.env.HOME}/${hpmRuntimeConfigurationFileName}`,
        );
    }

    // Method to get the singleton instance
    public static getInstance = (): RuntimeConfigurationService => {
        if (!RuntimeConfigurationService.instance) {
            RuntimeConfigurationService.instance = new RuntimeConfigurationService();
        }

        return RuntimeConfigurationService.instance;
    };

    // Method to get the runtime configuration
    public async getRuntimeConfiguration(): Promise<RuntimeConfiguration> {
        if (this.runtimeConfiguration) {
            return this.runtimeConfiguration;
        }

        // If the configuration file exists, read it and parse it
        if (await this.runtimeConfigurationFile.exists()) {
            const cache = JSON.parse(await this.runtimeConfigurationFile.text()) as unknown;
            if (!isRuntimeConfiguration(cache)) {
                throw new InvalidHpmrcFileError();
            }

            this.runtimeConfiguration = cache;

            return this.runtimeConfiguration;
        }

        // If the configuration file does not exist, return an empty configuration
        return {};
    }

    // Method to get a specific key from the runtime configuration
    public async getRuntimeConfigurationKey<T extends keyof RuntimeConfiguration>(
        key: T,
    ): Promise<RuntimeConfiguration[T] | undefined> {
        const runtimeConfiguration = await this.getRuntimeConfiguration();

        return runtimeConfiguration[key];
    }

    // Singleton instance
    private static instance: RuntimeConfigurationService;

    // Current runtime configuration
    private runtimeConfiguration?: RuntimeConfiguration;

    // File object for the runtime configuration file
    private readonly runtimeConfigurationFile: BunFile;

    // Method to set a specific key in the runtime configuration
    public async setRuntimeConfigurationKey(
        key: keyof RuntimeConfiguration,
        value: string,
    ): Promise<void> {
        const runtimeConfiguration = await this.getRuntimeConfiguration();
        runtimeConfiguration[key] = value;

        // Write the updated configuration back to the file
        await Bun.write(
            this.runtimeConfigurationFile,
            JSON.stringify(runtimeConfiguration, null, 2),
        );
    }
}
