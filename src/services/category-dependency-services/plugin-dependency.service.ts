import type { HpmDependency } from '../../shared/hpm';
import { NoCategoryFilesFoundError } from '../errors/no-category-files-found-error.exception';
import { GitHubService } from '../github.service';
import type { CategoryDependencyService } from './category-dependency-service.interface';

export class PluginDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(haConfigPath: string): string {
        return `${haConfigPath}/www/community/`;
    }

    // TODO: refactor this that it does not return a new type and searches in all files
    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
        refType: 'tag' | 'commit',
        hacsConfig: HpmDependency['hacsConfig'],
    ): Promise<{ files: string[] } | { ref: string; refType: 'tag'; releaseUrl: string }> {
        const directoryListResponse = await this.gitHubService.resolveDirectoryRecursively({
            repositorySlug,
            ref,
            path:
                typeof hacsConfig.contentInRoot === 'boolean'
                    ? hacsConfig.contentInRoot
                        ? ''
                        : 'dist'
                    : '',
        });

        const filterFileNames = (fileName: string): boolean => {
            const repoName = repositorySlug.split('/')[1];
            return (
                fileName === hacsConfig.filename ||
                fileName === `${repoName}.js` ||
                fileName === `${repoName}.umd.js` ||
                fileName === `${repoName}-bundle.js` ||
                fileName === `${repoName.replace('lovelace-', '')}.js`
            );
        };

        const filteredDirectoryListResponse = directoryListResponse.filter(file => {
            const fileName = file.split('/').pop() ?? '';
            return filterFileNames(fileName);
        });

        if (filteredDirectoryListResponse.length !== 0) {
            return { files: filteredDirectoryListResponse };
        }

        const releaseRef =
            refType === 'tag'
                ? ref
                : await this.gitHubService.fetchLatestReleaseTag(repositorySlug);

        const fetchReleaseArtifactAssets = (
            await this.gitHubService.fetchRelease({
                repositorySlug,
                ref: releaseRef,
            })
        ).assets;

        const filteredAssets = fetchReleaseArtifactAssets.filter(asset =>
            filterFileNames(asset.name),
        );

        if (filteredAssets.length === 0) {
            throw new NoCategoryFilesFoundError(repositorySlug, ref, 'plugin');
        }

        return {
            releaseUrl: filteredAssets[0].browser_download_url,
            ref: releaseRef,
            refType: 'tag',
        };
    }
}
