import { type HpmDependency } from '../../shared/hpm';
import { NoCategoryFilesFoundError } from '../errors/no-category-files-found-error.exception';
import { GitHubService } from '../github.service';
import { type CategoryDependencyService } from './category-dependency-service.interface';

export class ThemeDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(categoryBasePath: string, haConfigPath: string): string {
        return `${haConfigPath}/${categoryBasePath}/`;
    }

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
        refType: 'commit' | 'tag',
        hacsConfig: HpmDependency['hacsConfig'],
    ): Promise<{ remoteFiles: string[] }> {
        const dependencyPath = 'themes';
        const filename = hacsConfig.filename;

        if (filename) {
            if (
                await this.gitHubService.checkIfFileExists({
                    path: `${dependencyPath}/${filename}`,
                    ref,
                    repositorySlug,
                })
            ) {
                return { remoteFiles: [`${dependencyPath}/${filename}`] };
            }

            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'theme');
        }

        const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            path: dependencyPath,
            ref,
            repositorySlug,
        });

        const filteredFiles = directoryListResponse.filter((file) => file.endsWith('.yaml'));

        if (filteredFiles.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'theme');
        }

        return { remoteFiles: filteredFiles };
    }
}
