import type { HpmDependency } from '../../shared/hpm';
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
        refType: 'tag' | 'commit',
        hacsConfig: HpmDependency['hacsConfig'],
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

        let filteredFiles = filteredDirectoryListResponse;
        const filename = hacsConfig.filename;

        if (filename) {
            filteredFiles = directoryListResponse.filter(file => file.endsWith(filename));
        }

        if (filteredFiles.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'theme');
        }

        return { files: filteredFiles };
    }
}
