import type { HpmDependency } from '../../shared/hpm';
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
        refType: 'tag' | 'commit',
        hacsConfig: HpmDependency['hacsConfig'],
    ): Promise<{ files: string[] }> {
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
                return { files: [`${dependencyPath}/${filename}`] };
            }

            if (
                await this.gitHubService.checkIfFileExists({
                    repositorySlug,
                    ref,
                    path: filename,
                })
            ) {
                return { files: [filename] };
            }

            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'pythonScript');
        }

        let directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            repositorySlug,
            ref,
            path: dependencyPath,
        });

        if (directoryListResponse.length === 0) {
            directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
                repositorySlug,
                ref,
                path: '',
            });
        }

        const filteredFiles = directoryListResponse.filter(file => file.endsWith('.py'));

        if (filteredFiles.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'pythonScript');
        }

        return { files: filteredFiles };
    }
}
