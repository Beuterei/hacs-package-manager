import type { HacsConfig } from './hacs';

interface HpmDependencyBase {
    category:
        | 'appdaemon'
        | 'integration'
        | 'netdaemon'
        | 'plugins'
        | 'pythonScript'
        | 'template'
        | 'theme';
    hacsConfig: HacsConfig;
    ref: string;
    refType: 'tag' | 'commit';
}

export interface HpmDependencyFiles extends HpmDependencyBase {
    files: string[];
}

export interface HpmDependencyZipRelease extends HpmDependencyBase {
    releaseUrl: string;
}

export type HpmDependency = HpmDependencyZipRelease | HpmDependencyFiles;

export interface HpmDependencies {
    [key: string]: HpmDependency;
}
