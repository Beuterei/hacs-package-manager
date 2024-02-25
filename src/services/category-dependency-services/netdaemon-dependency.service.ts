import { constructSubDirectory } from '../../util/dependency.helper';
import { NoCategoryFilesFoundError } from '../errors/no-category-files-found-error.exception';
import { GitHubService } from '../github.service';
import type { CategoryDependencyService } from './category-dependency-service.interface';

export class NetdaemonDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(
        haConfigPath: string,
        repositorySlug: string,
        remoteFile?: string,
    ): string {
        return `${haConfigPath}/netdaemon/apps/${constructSubDirectory(
            repositorySlug,
            remoteFile,
        )}/`;
    }

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
    ): Promise<{ remoteFiles: string[] }> {
        const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            repositorySlug,
            ref,
            path: 'apps',
        });

        const filteredDirectoryListResponse = directoryListResponse.filter(file =>
            file.endsWith('.cs'),
        );

        if (filteredDirectoryListResponse.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'netdaemon');
        }

        return { remoteFiles: filteredDirectoryListResponse };
    }
}
