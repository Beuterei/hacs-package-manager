import type { HpmDependency } from '../../shared/hpm';

export interface CategoryDependencyService {
    getLocalDependencyPath: (
        haConfigPath: string,
        repositorySlug: string,
        remoteFile?: string,
    ) => string;
    resolveDependencyArtifacts: (
        repositorySlug: string,
        ref: string,
        refType: 'tag' | 'commit',
        hacsConfig: HpmDependency['hacsConfig'],
    ) => Promise<
        | { remoteFiles: string[] }
        | { localReferences: string[]; ref: string; refType: 'tag'; releaseUrl: string }
    >;
}
