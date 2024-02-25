import type { HpmDependency } from '../../shared/hpm';
import { constructSubDirectory } from '../../util/dependency.helper';
import { NoCategoryFilesFoundError } from '../errors/no-category-files-found-error.exception';
import { GitHubService } from '../github.service';
import type { CategoryDependencyService } from './category-dependency-service.interface';

export class IntegrationDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(
        haConfigPath: string,
        repositorySlug: string,
        remoteFile?: string,
    ): string {
        return `${haConfigPath}/custom_components/${constructSubDirectory(
            repositorySlug,
            remoteFile,
        )}/`;
    }

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
        refType: 'tag' | 'commit',
        hacsConfig: HpmDependency['hacsConfig'],
    ): Promise<{ remoteFiles: string[] }> {
        const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            repositorySlug,
            ref,
            path: hacsConfig.contentInRoot ? '' : 'custom_components',
        });

        if (directoryListResponse.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'integration');
        }

        return { remoteFiles: directoryListResponse };
    }
}
