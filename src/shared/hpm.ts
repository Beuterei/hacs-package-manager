import type { Defaults, HacsConfig } from './hacs';

interface HpmDependencyBase {
    category: keyof Defaults;
    hacsConfig: HacsConfig;
    ref: string;
    refType: 'tag' | 'commit';
}

export interface HpmDependencyFiles extends HpmDependencyBase {
    remoteFiles: string[];
}

export interface HpmDependencyZipRelease extends HpmDependencyBase {
    localReferences: string[];
    releaseUrl: string;
}

export type HpmDependency = HpmDependencyZipRelease | HpmDependencyFiles;

export interface HpmDependencies {
    [key: string]: HpmDependency;
}
