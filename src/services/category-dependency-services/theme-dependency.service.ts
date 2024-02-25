import { NoCategoryFilesFoundError } from '../errors/no-category-files-found-error.exception';
import { GitHubService } from '../github.service';
import type { CategoryDependencyService } from './category-dependency-service.interface';

export class ThemeDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(haConfigPath: string): string {
        return `${haConfigPath}/themes/`;
    }

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
    ): Promise<{ files: string[] }> {
        const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            repositorySlug,
            ref,
            path: '',
        });

        let filteredDirectoryListResponse = directoryListResponse.filter(file =>
            file.startsWith('theme'),
        );

        if (filteredDirectoryListResponse.length === 0) {
            filteredDirectoryListResponse = directoryListResponse.filter(file =>
                file.endsWith('.yaml'),
            );
        }

        if (filteredDirectoryListResponse.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'theme');
        }

        return { files: filteredDirectoryListResponse };
    }
}
