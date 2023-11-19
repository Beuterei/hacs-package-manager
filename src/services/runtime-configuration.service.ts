import { InvalidHpmrcFileError } from './errors/invalidHpmrcFileError.exception';
import type { BunFile } from 'bun';

const runtimeConfigurationKeys: Array<keyof RuntimeConfiguration> = ['gitHubToken'];

export const isRuntimeConfigurationKey = (key: unknown): key is keyof RuntimeConfiguration =>
    typeof key === 'string' && runtimeConfigurationKeys.includes(key as keyof RuntimeConfiguration);

export interface RuntimeConfiguration {
    gitHubToken?: string;
}

export const isRuntimeConfiguration = (object: unknown): object is RuntimeConfiguration =>
    typeof object === 'object' &&
    object !== null &&
    ('gitHubToken' in object ? typeof object.gitHubToken === 'string' : true);

export class RuntimeConfigurationService {
    private constructor() {
        const hpmRuntimeConfigurationFileName = '.hpmrc';
        this.runtimeConfigurationFile = Bun.file(
            process.platform === 'win32'
                ? `${Bun.env.APPDATA}\\${hpmRuntimeConfigurationFileName}`
                : `${Bun.env.HOME}/${hpmRuntimeConfigurationFileName}`,
        );
    }

    public static getInstance = (): RuntimeConfigurationService => {
        if (!RuntimeConfigurationService.instance) {
            RuntimeConfigurationService.instance = new RuntimeConfigurationService();
        }

        return RuntimeConfigurationService.instance;
    };

    public async getRuntimeConfiguration(): Promise<RuntimeConfiguration> {
        if (this.runtimeConfiguration) {
            return this.runtimeConfiguration;
        }

        if (await this.runtimeConfigurationFile.exists()) {
            const cache = JSON.parse(await this.runtimeConfigurationFile.text()) as unknown;
            if (!isRuntimeConfiguration(cache)) {
                throw new InvalidHpmrcFileError();
            }

            this.runtimeConfiguration = cache;

            return this.runtimeConfiguration;
        }

        return {};
    }

    public async getRuntimeConfigurationKey<T extends keyof RuntimeConfiguration>(
        key: T,
    ): Promise<RuntimeConfiguration[T] | undefined> {
        const runtimeConfiguration = await this.getRuntimeConfiguration();

        return runtimeConfiguration[key];
    }

    private static instance: RuntimeConfigurationService;

    private runtimeConfiguration?: RuntimeConfiguration;

    private readonly runtimeConfigurationFile: BunFile;

    public async setRuntimeConfigurationKey(
        key: keyof RuntimeConfiguration,
        value: string,
    ): Promise<void> {
        const runtimeConfiguration = await this.getRuntimeConfiguration();
        runtimeConfiguration[key] = value;

        await Bun.write(
            this.runtimeConfigurationFile,
            JSON.stringify(runtimeConfiguration, null, 2),
        );
    }
}
