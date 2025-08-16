import { type Defaults, type HacsConfig } from './hacs';

export interface HpmDependencies {
    [key: string]: HpmDependency;
}

export type HpmDependency = HpmDependencyFiles | HpmDependencyZipRelease;

export interface HpmDependencyFiles extends HpmDependencyBase {
    remoteFiles: string[];
}

export interface HpmDependencyZipRelease extends HpmDependencyBase {
    localReferences: string[];
    releaseUrl: string;
}

interface HpmDependencyBase {
    category: keyof Defaults;
    hacsConfig: HacsConfig;
    ref: string;
    refType: 'commit' | 'tag';
}
