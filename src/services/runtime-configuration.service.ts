import { InvalidHpmrcFileError } from './errors/invalidHpmrcFileError.exception';
import { InvalidHpmrcKeyError } from './errors/invalidHpmrcKeyError.exception';
import type { BunFile } from 'bun';

const runtimeConfigurationKeys: Array<keyof RuntimeConfiguration> = ['gitHubToken'];

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

    public async getRuntimeConfigurationKey(key: string): Promise<string | undefined> {
        // TODO: fix return type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!runtimeConfigurationKeys.includes(key as any)) {
            throw new InvalidHpmrcKeyError(key);
        }

        const runtimeConfiguration = await this.getRuntimeConfiguration();

        return runtimeConfiguration[key as keyof RuntimeConfiguration];
    }

    private static instance: RuntimeConfigurationService;

    private runtimeConfiguration?: RuntimeConfiguration;

    private readonly runtimeConfigurationFile: BunFile;

    public async setRuntimeConfigurationKey(key: string, value: string): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!runtimeConfigurationKeys.includes(key as any)) {
            throw new InvalidHpmrcKeyError(key);
        }

        const runtimeConfiguration = await this.getRuntimeConfiguration();
        runtimeConfiguration[key as keyof RuntimeConfiguration] = value;

        await Bun.write(
            this.runtimeConfigurationFile,
            JSON.stringify(runtimeConfiguration, null, 2),
        );
    }
}
