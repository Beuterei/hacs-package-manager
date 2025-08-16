import { NoCategoryFilesFoundError } from '../errors/no-category-files-found-error.exception';
import { GitHubService } from '../github.service';
import { type CategoryDependencyService } from './category-dependency-service.interface';

export class TemplateDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(categoryBasePath: string, haConfigPath: string): string {
        return `${haConfigPath}/${categoryBasePath}/`;
    }

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
    ): Promise<{ remoteFiles: string[] }> {
        const dependencyPath = 'template';

        let directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            path: dependencyPath,
            ref,
            repositorySlug,
        });

        if (directoryListResponse.length === 0) {
            directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
                path: '',
                ref,
                repositorySlug,
            });
        }

        const filteredFiles = directoryListResponse.filter((file) => file.endsWith('.jinja'));

        if (filteredFiles.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'template');
        }

        return { remoteFiles: filteredFiles };
    }
}
