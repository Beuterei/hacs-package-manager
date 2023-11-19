import type { HacsConfig } from './hacs';

export interface HpmDependency {
    hacsConfig: HacsConfig;
    ref: string;
    refType: 'tag' | 'commit';
}

export interface HpmDependencies {
    [key: string]: HpmDependency;
}
