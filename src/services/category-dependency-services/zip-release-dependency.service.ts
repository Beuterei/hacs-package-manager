import type { HpmDependency } from '../../shared/hpm';
import { NoReleaseFileSpecifiedError } from '../errors/no-release-file-specified-error.exception';
import { GitHubService } from '../github.service';

export class ZipReleaseDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
        refType: 'tag' | 'commit',
        hacsConfig: HpmDependency['hacsConfig'],
    ): Promise<{ releaseUrl: string }> {
        const releaseFileName = hacsConfig.filename;

        if (!releaseFileName) {
            throw new NoReleaseFileSpecifiedError(repositorySlug, ref);
        }

        const releaseUrl = (
            await this.gitHubService.fetchReleaseArtifact({
                repositorySlug,
                path: releaseFileName,
                ref,
            })
        ).browser_download_url;

        return { releaseUrl };
    }
}
