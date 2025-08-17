// Importing necessary modules and types
import { InvalidHpmrcFileError } from './errors/invalid-hpmrc-file-error.exception';
import { type BunFile } from 'bun';

// Define the keys that are valid for runtime configuration
const runtimeConfigurationKeys: Array<keyof RuntimeConfiguration> = ['gitHubToken'];

// Type guard to check if a key is a valid runtime configuration key
export const isRuntimeConfigurationKey = (key: unknown): key is keyof RuntimeConfiguration =>
    typeof key === 'string' && runtimeConfigurationKeys.includes(key as keyof RuntimeConfiguration);

// Interface for the runtime configuration
export interface RuntimeConfiguration {
    gitHubToken?: string; // GitHub token for authentication
}

// Define the mapping between configuration keys and their corresponding environment variable names
const environmentVariableMap: Record<keyof RuntimeConfiguration, `HPM_${string}`> = {
    gitHubToken: 'HPM_GITHUB_TOKEN',
};

// Type guard to check if an object is a valid runtime configuration
export const isRuntimeConfiguration = (object: unknown): object is RuntimeConfiguration =>
    typeof object === 'object' &&
    object !== null &&
    ('gitHubToken' in object ? typeof object.gitHubToken === 'string' : true);

// Class for managing the runtime configuration
export class RuntimeConfigurationService {
    // Singleton instance
    private static instance: RuntimeConfigurationService;

    // Current runtime configuration
    private runtimeConfiguration?: RuntimeConfiguration;

    // File object for the runtime configuration file
    private readonly runtimeConfigurationFile: BunFile;

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
            return this.applyEnvironmentVariableOverrides(this.runtimeConfiguration);
        }

        let fileConfiguration: RuntimeConfiguration = {};

        // If the configuration file exists, read it and parse it
        if (await this.runtimeConfigurationFile.exists()) {
            const cache = JSON.parse(await this.runtimeConfigurationFile.text()) as unknown;
            if (!isRuntimeConfiguration(cache)) {
                throw new InvalidHpmrcFileError();
            }

            fileConfiguration = cache;
        }

        this.runtimeConfiguration = fileConfiguration;

        // Apply environment variable overrides to the file configuration
        return this.applyEnvironmentVariableOverrides(this.runtimeConfiguration);
    }

    // Method to get a specific key from the runtime configuration
    public async getRuntimeConfigurationKey<T extends keyof RuntimeConfiguration>(
        key: T,
    ): Promise<RuntimeConfiguration[T] | undefined> {
        const runtimeConfiguration = await this.getRuntimeConfiguration();

        return runtimeConfiguration[key];
    }

    // Method to set a specific key in the runtime configuration
    public async setRuntimeConfigurationKey(
        key: keyof RuntimeConfiguration,
        value: string,
    ): Promise<void> {
        // Ensure we have loaded the file configuration
        await this.getRuntimeConfiguration();

        // Update the file configuration (not the environment-overridden one)
        this.runtimeConfiguration ??= {};

        this.runtimeConfiguration[key] = value;

        // Write the updated configuration back to the file
        await Bun.write(
            this.runtimeConfigurationFile,
            JSON.stringify(this.runtimeConfiguration, null, 2),
        );
    }

    // Private method to apply environment variable overrides to the configuration
    private applyEnvironmentVariableOverrides(config: RuntimeConfiguration): RuntimeConfiguration {
        const result = { ...config };

        // Check each configuration key for corresponding environment variables
        for (const [key, environmentVariable] of Object.entries(environmentVariableMap)) {
            const environmentValue = Bun.env[environmentVariable];
            if (environmentValue) {
                result[key as keyof RuntimeConfiguration] = environmentValue;
            }
        }

        return result;
    }
}
