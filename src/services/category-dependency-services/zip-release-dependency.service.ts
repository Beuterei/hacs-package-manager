import type { HpmDependency } from '../../shared/hpm';
import { NoReleaseFileSpecifiedError } from '../errors/no-release-file-specified-error.exception';
import { GitHubService } from '../github.service';
import Zip from 'jszip';

export class ZipReleaseDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public async resolveDependencyArtifacts(
        repositorySlug: string,
        ref: string,
        refType: 'tag' | 'commit',
        hacsConfig: HpmDependency['hacsConfig'],
    ): Promise<{ localReferences: string[]; releaseUrl: string }> {
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

        const zipArrayBuffer = await (await fetch(releaseUrl)).arrayBuffer();

        const zip = await new Zip().loadAsync(zipArrayBuffer);

        const localReferences: string[] = [];
        zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) {
                return;
            }

            localReferences.push(relativePath);
        });

        return { releaseUrl, localReferences };
    }
}
