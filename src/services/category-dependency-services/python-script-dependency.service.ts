import type { HpmDependency } from '../../shared/hpm';
import { NoCategoryFilesFoundError } from '../errors/no-category-files-found-error.exception';
import { GitHubService } from '../github.service';
import type { CategoryDependencyService } from './category-dependency-service.interface';

export class PythonScriptDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(categoryBasePath: string, haConfigPath: string): string {
        return `${haConfigPath}/${categoryBasePath}/`;
    }

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
        refType: 'tag' | 'commit',
        hacsConfig: HpmDependency['hacsConfig'],
    ): Promise<{ remoteFiles: string[] }> {
        const dependencyPath = 'python_scripts';
        const filename = hacsConfig.filename;

        if (filename) {
            if (
                await this.gitHubService.checkIfFileExists({
                    repositorySlug,
                    ref,
                    path: `${dependencyPath}/${filename}`,
                })
            ) {
                return { remoteFiles: [`${dependencyPath}/${filename}`] };
            }

            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'pythonScript');
        }

        const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            repositorySlug,
            ref,
            path: dependencyPath,
        });

        const filteredFiles = directoryListResponse.filter(file => file.endsWith('.py'));

        if (filteredFiles.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'pythonScript');
        }

        return { remoteFiles: filteredFiles };
    }
}
