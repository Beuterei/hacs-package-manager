import { NoCategoryFilesFoundError } from '../errors/no-category-files-found-error.exception';
import { GitHubService } from '../github.service';
import type { CategoryDependencyService } from './category-dependency-service.interface';

export class PythonScriptDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(haConfigPath: string): string {
        return `${haConfigPath}/python_scripts/`;
    }

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
    ): Promise<{ files: string[] }> {
        const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            repositorySlug,
            ref,
            path: '', // TODO: Optimise to first try to only get the python_scripts directory. Do the same for the other types.
        });

        let filteredDirectoryListResponse = directoryListResponse.filter(file =>
            file.startsWith('pythonScript'),
        );

        if (filteredDirectoryListResponse.length === 0) {
            filteredDirectoryListResponse = directoryListResponse.filter(file =>
                file.endsWith('.py'),
            );
        }

        if (filteredDirectoryListResponse.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'pythonScript');
        }

        return { files: filteredDirectoryListResponse };
    }
}
