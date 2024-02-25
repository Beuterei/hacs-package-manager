import { constructSubDirectory } from '../../util/dependency.helper';
import { NoCategoryFilesFoundError } from '../errors/no-category-files-found-error.exception';
import { GitHubService } from '../github.service';
import type { CategoryDependencyService } from './category-dependency-service.interface';

export class AppdaemonDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(
        haConfigPath: string,
        repositorySlug: string,
        remoteFile?: string,
    ): string {
        return `${haConfigPath}/appdaemon/apps/${constructSubDirectory(
            repositorySlug,
            remoteFile,
        )}/`;
    }

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
    ): Promise<{ files: string[] }> {
        const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            repositorySlug,
            ref,
            path: 'apps',
        });

        if (directoryListResponse.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'appdaemon');
        }

        return { files: directoryListResponse };
    }
}
