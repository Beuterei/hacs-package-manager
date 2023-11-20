import type { HacsConfig } from './hacs';

export interface HpmDependency {
    category:
        | 'appdaemon'
        | 'integration'
        | 'netdaemon'
        | 'plugins'
        | 'pythonScript'
        | 'template'
        | 'theme';
    files: string[];
    hacsConfig: HacsConfig;
    ref: string;
    refType: 'tag' | 'commit';
}

export interface HpmDependencies {
    [key: string]: HpmDependency;
}
