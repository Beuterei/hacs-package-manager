import { HttpExceptionError } from './errors/http-exception-error.exception';
import { InvalidGitHubResponseError } from './errors/invalid-git-hub-response-error.exception';
import { InvalidRefTypeError } from './errors/invalid-ref-type-error.exception';
import { RuntimeConfigurationService } from './runtime-configuration.service';

type GitHubContentDirectoryList = Array<GitHubContentListDirectoryItem | GitHubContentListFileItem>;

interface GitHubContentFile {
    content: string;
    name: string;
    path: string;
    type: 'file';
}

interface GitHubContentListDirectoryItem extends GitHubContentListItemBase {
    type: 'dir';
}

interface GitHubContentListFileItem extends GitHubContentListItemBase {
    type: 'file';
}

interface GitHubContentListItemBase {
    name: string;
    path: string;
}

interface GitHubRelease {
    assets: GitHubReleaseArtifact[];
    tag_name: string;
}

interface GitHubReleaseArtifact {
    browser_download_url: string;
    name: string;
}

interface MatchedRef {
    matchedRef: string;
    matchedRefType: 'commit' | 'head' | 'tag';
}

const isGitHubContentListItemBase = (object: unknown): object is GitHubContentListItemBase =>
    typeof object === 'object' &&
    object !== null &&
    'name' in object &&
    typeof object.name === 'string' &&
    'path' in object &&
    typeof object.path === 'string';

const isGitHubContentListDirectoryItem = (
    object: GitHubContentListItemBase,
): object is GitHubContentListDirectoryItem => 'type' in object && object.type === 'dir';

const isGitHubContentListFileItem = (
    object: GitHubContentListItemBase,
): object is GitHubContentListFileItem => 'type' in object && object.type === 'file';

const isGitHubContentDirectoryList = (object: unknown): object is GitHubContentDirectoryList =>
    Array.isArray(object) &&
    object.every(
        (item: unknown) =>
            isGitHubContentListItemBase(item) &&
            (isGitHubContentListDirectoryItem(item) || isGitHubContentListFileItem(item)),
    );

const isGitHubContentFile = (object: unknown): object is GitHubContentFile =>
    typeof object === 'object' &&
    object !== null &&
    'content' in object &&
    typeof object.content === 'string' &&
    'name' in object &&
    typeof object.name === 'string' &&
    'path' in object &&
    typeof object.path === 'string' &&
    'type' in object &&
    object.type === 'file';

const isGitHubReleaseArtifact = (object: unknown): object is GitHubReleaseArtifact =>
    typeof object === 'object' &&
    object !== null &&
    'browser_download_url' in object &&
    typeof object.browser_download_url === 'string' &&
    'name' in object &&
    typeof object.name === 'string';

const isGitHubRelease = (object: unknown): object is GitHubRelease =>
    typeof object === 'object' &&
    object !== null &&
    'tag_name' in object &&
    typeof object.tag_name === 'string' &&
    'assets' in object &&
    Array.isArray(object.assets) &&
    object.assets.every((asset) => isGitHubReleaseArtifact(asset));

export class GitHubService {
    public constructor(
        private runtimeConfigurationService = RuntimeConfigurationService.getInstance(),
    ) {}

    public async checkIfFileExists({
        path,
        ref,
        repositorySlug,
    }: {
        path: string;
        ref?: string;
        repositorySlug: string;
    }): Promise<boolean> {
        try {
            await this.fetchFile({ path, ref, repositorySlug });
            return true;
        } catch (error) {
            if (error instanceof HttpExceptionError && error.status === 404) {
                return false;
            } else {
                throw error;
            }
        }
    }

    public async checkIfReleasesExist(repositorySlug: string): Promise<boolean> {
        const response = await fetch(`https://api.github.com/repos/${repositorySlug}/releases`, {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                    'gitHubToken',
                )}`,
            },
        });

        if (!response.ok) {
            throw new HttpExceptionError(response.status, repositorySlug);
        }

        const jsonResponse = await response.json();

        return Array.isArray(jsonResponse) && jsonResponse.length > 0;
    }

    public async fetchFile({
        path,
        ref,
        repositorySlug,
    }: {
        path: string;
        ref?: string;
        repositorySlug: string;
    }): Promise<GitHubContentFile> {
        const contentBaseTypeResponse = await this.fetchContent({ path, ref, repositorySlug });

        if (isGitHubContentFile(contentBaseTypeResponse)) {
            return contentBaseTypeResponse;
        }

        throw new InvalidGitHubResponseError(repositorySlug, ref);
    }

    public async fetchLatestCommit(repositorySlug: string): Promise<string> {
        const response = await fetch(
            `https://api.github.com/repos/${repositorySlug}/commits?per_page=1`,
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                        'gitHubToken',
                    )}`,
                },
            },
        );

        const jsonResponse = await response.json();

        if (
            !Array.isArray(jsonResponse) ||
            jsonResponse.length === 0 ||
            !jsonResponse[0].sha ||
            typeof jsonResponse[0].sha !== 'string'
        ) {
            throw new InvalidGitHubResponseError(repositorySlug);
        }

        return jsonResponse[0].sha;
    }

    public async fetchLatestReleaseTag(repositorySlug: string): Promise<string> {
        const response = await fetch(
            `https://api.github.com/repos/${repositorySlug}/releases/latest`,
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                        'gitHubToken',
                    )}`,
                },
            },
        );

        const jsonResponse = await response.json();

        if (!isGitHubRelease(jsonResponse)) {
            throw new InvalidGitHubResponseError(repositorySlug);
        }

        return jsonResponse.tag_name;
    }

    public async fetchRelease({
        ref,
        repositorySlug,
    }: {
        ref: string;
        repositorySlug: string;
    }): Promise<GitHubRelease> {
        const response = await fetch(
            `https://api.github.com/repos/${repositorySlug}/releases/tags/${ref}`,
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                        'gitHubToken',
                    )}`,
                },
            },
        );

        if (!response.ok) {
            throw new HttpExceptionError(response.status, repositorySlug, undefined, ref);
        }

        const jsonResponse = await response.json();

        if (!isGitHubRelease(jsonResponse)) {
            throw new InvalidGitHubResponseError(repositorySlug, ref);
        }

        return jsonResponse;
    }

    public async fetchReleaseArtifact({
        path,
        ref,
        repositorySlug,
    }: {
        path: string;
        ref: string;
        repositorySlug: string;
    }): Promise<GitHubReleaseArtifact> {
        const foundAsset = (await this.fetchRelease({ ref, repositorySlug })).assets.find(
            (asset) => asset.name === path,
        );

        if (!foundAsset) {
            throw new Error(`No asset found for '${path}'.`);
        }

        return foundAsset;
    }

    public async listDirectory({
        path,
        ref,
        repositorySlug,
    }: {
        path: string;
        ref: string;
        repositorySlug: string;
    }): Promise<GitHubContentDirectoryList> {
        const ContentBaseTypeResponse = await this.fetchContent({ path, ref, repositorySlug });

        if (!isGitHubContentDirectoryList(ContentBaseTypeResponse)) {
            throw new InvalidGitHubResponseError(repositorySlug, ref);
        }

        return ContentBaseTypeResponse;
    }

    public async matchRef({
        repositorySlug,
        unresolvedRef,
    }: {
        repositorySlug: string;
        unresolvedRef: string;
    }): Promise<MatchedRef> {
        const tryResolveRef = async (
            typeToCheckFor: 'commit' | 'head' | 'tag',
        ): Promise<MatchedRef | undefined> => {
            const response = await fetch(
                `https://api.github.com/repos/${repositorySlug}/git/matching-refs/${typeToCheckFor}s/${unresolvedRef}`,
                {
                    headers: {
                        Accept: 'application/vnd.github+json',
                        Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                            'gitHubToken',
                        )}`,
                    },
                },
            );

            const jsonResponse = await response.json();

            if (!Array.isArray(jsonResponse)) {
                throw new InvalidGitHubResponseError(repositorySlug, unresolvedRef);
            }

            if (
                jsonResponse.length === 0 ||
                !jsonResponse[jsonResponse.length - 1].ref ||
                typeof jsonResponse[jsonResponse.length - 1].ref !== 'string'
            ) {
                return undefined;
            }

            return {
                matchedRef: jsonResponse[jsonResponse.length - 1].ref.split('/')[2],
                matchedRefType: typeToCheckFor,
            };
        };

        const resolveCommitRef = async (): Promise<MatchedRef | undefined> => {
            const response = await fetch(
                `https://api.github.com/repos/${repositorySlug}/commits/${unresolvedRef}`,
                {
                    headers: {
                        Accept: 'application/vnd.github+json',
                        Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                            'gitHubToken',
                        )}`,
                    },
                },
            );

            const jsonResponse = await response.json();

            if (jsonResponse.sha && typeof jsonResponse.sha === 'string') {
                return {
                    matchedRef: jsonResponse.sha,
                    matchedRefType: 'commit',
                };
            }

            return undefined;
        };

        const matchedRef =
            (await tryResolveRef('tag')) ??
            (await resolveCommitRef()) ??
            (await tryResolveRef('head'));

        if (matchedRef) {
            return matchedRef;
        }

        throw new InvalidRefTypeError(repositorySlug, unresolvedRef);
    }

    /**
     * Returns an empty array if the directory does not exist. This is not optimal but syntax sugar for the caller in most cases.
     */
    public async resolveDirectory({
        path,
        ref,
        repositorySlug,
    }: {
        path: string;
        ref: string;
        repositorySlug: string;
    }): Promise<string[]> {
        let directoryListResponse;
        try {
            directoryListResponse = await this.listDirectory({ path, ref, repositorySlug });
        } catch (error) {
            if (error instanceof HttpExceptionError && error.status === 404) {
                return [];
            } else {
                throw error;
            }
        }

        const allFiles: string[] = [];

        for (const item of directoryListResponse) {
            if (isGitHubContentListFileItem(item)) {
                allFiles.push(item.path);
            }
        }

        return allFiles;
    }

    /**
     * Returns an empty array if the directory does not exist. This is not optimal but syntax sugar for the caller in most cases.
     */
    public async resolveDirectoryRecursively({
        path,
        ref,
        repositorySlug,
    }: {
        path: string;
        ref: string;
        repositorySlug: string;
    }): Promise<string[]> {
        let directoryListResponse;
        try {
            directoryListResponse = await this.listDirectory({ path, ref, repositorySlug });
        } catch (error) {
            if (error instanceof HttpExceptionError && error.status === 404) {
                return [];
            } else {
                throw error;
            }
        }

        let allFiles: string[] = [];

        for (const item of directoryListResponse) {
            if (isGitHubContentListFileItem(item)) {
                allFiles.push(item.path);
            } else if (isGitHubContentListDirectoryItem(item)) {
                const subDirectoryFiles = await this.resolveDirectoryRecursively({
                    path: item.path,
                    ref,
                    repositorySlug,
                });
                allFiles = allFiles.concat(subDirectoryFiles);
            }
        }

        return allFiles;
    }

    private async fetchContent({
        path,
        ref,
        repositorySlug,
    }: {
        path: string;
        ref?: string;
        repositorySlug: string;
    }): Promise<GitHubContentDirectoryList | GitHubContentFile> {
        const refQuery = ref ? `?ref=${ref}` : '';
        const response = await fetch(
            `https://api.github.com/repos/${repositorySlug}/contents/${path}${refQuery}`,
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                        'gitHubToken',
                    )}`,
                },
            },
        );

        if (!response.ok) {
            throw new HttpExceptionError(response.status, repositorySlug, path, ref);
        }

        const jsonResponse = await response.json();

        if (!isGitHubContentFile(jsonResponse) && !isGitHubContentDirectoryList(jsonResponse)) {
            throw new InvalidGitHubResponseError(repositorySlug, ref);
        }

        return jsonResponse;
    }
}
