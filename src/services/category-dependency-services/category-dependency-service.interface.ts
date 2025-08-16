import { type HpmDependency } from '../../shared/hpm';

export interface CategoryDependencyService {
    getLocalDependencyPath: (
        categoryBasePath: string,
        haConfigPath: string,
        repositorySlug: string,
        remoteFile?: string,
    ) => string;
    resolveDependencyArtifacts: (
        repositorySlug: string,
        ref: string,
        refType: 'commit' | 'tag',
        hacsConfig: HpmDependency['hacsConfig'],
    ) => Promise<
        | { localReferences: string[]; ref: string; refType: 'tag'; releaseUrl: string }
        | { remoteFiles: string[] }
    >;
}
