import { HttpExceptionError } from './errors/httpExceptionError.exception';
import { InvalidGitHubResponseError } from './errors/invalidGitHubResponseError.exception';
import { InvalidRefTypeError } from './errors/invalidRefTypeError.exception';
import { RuntimeConfigurationService } from './runtime-configuration.service';

interface GitHubContentListItemBase {
    name: string;
    path: string;
}

interface GitHubContentListDirectoryItem extends GitHubContentListItemBase {
    type: 'dir';
}

interface GitHubContentListFileItem extends GitHubContentListItemBase {
    type: 'file';
}

type GitHubContentDirectoryList = Array<GitHubContentListDirectoryItem | GitHubContentListFileItem>;

interface GitHubContentFile {
    content: string;
    name: string;
    path: string;
    type: 'file';
}

interface MatchedRef {
    matchedRef: string;
    matchedRefType: 'tag' | 'commit' | 'head';
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

export class GitHubService {
    public constructor(
        private runtimeConfigurationService = RuntimeConfigurationService.getInstance(),
    ) {}

    private async fetchContentAPI({
        repositorySlug,
        path,
        ref,
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
                    Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                        'gitHubToken',
                    )}`,
                    Accept: 'application/vnd.github+json',
                },
            },
        );

        if (!response.ok) {
            throw new HttpExceptionError(response.statusText, repositorySlug, path, ref);
        }

        const jsonResponse = await response.json();

        if (!isGitHubContentFile(jsonResponse) && !isGitHubContentDirectoryList(jsonResponse)) {
            console.log(jsonResponse);
            throw new InvalidGitHubResponseError(repositorySlug, ref);
        }

        return jsonResponse;
    }

    public async fetchFile({
        repositorySlug,
        path,
        ref,
    }: {
        path: string;
        ref?: string;
        repositorySlug: string;
    }): Promise<GitHubContentFile> {
        const contentBaseTypeResponse = await this.fetchContentAPI({ repositorySlug, path, ref });

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
                    Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                        'gitHubToken',
                    )}`,
                    Accept: 'application/vnd.github+json',
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

    public async listDirectory({
        repositorySlug,
        path,
        ref,
    }: {
        path: string;
        ref: string;
        repositorySlug: string;
    }): Promise<GitHubContentDirectoryList> {
        const ContentBaseTypeResponse = await this.fetchContentAPI({ repositorySlug, path, ref });

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
            typeToCheckFor: 'tag' | 'commit' | 'head',
        ): Promise<MatchedRef | undefined> => {
            const response = await fetch(
                `https://api.github.com/repos/${repositorySlug}/git/matching-refs/${typeToCheckFor}s/${unresolvedRef}`,
                {
                    headers: {
                        Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                            'gitHubToken',
                        )}`,
                        Accept: 'application/vnd.github+json',
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
                        Authorization: `token ${await this.runtimeConfigurationService.getRuntimeConfigurationKey(
                            'gitHubToken',
                        )}`,
                        Accept: 'application/vnd.github+json',
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

    public async resolveDirectoryRecursively({
        repositorySlug,
        path,
        ref,
    }: {
        path: string;
        ref: string;
        repositorySlug: string;
    }): Promise<string[]> {
        const directoryListResponse = await this.listDirectory({ repositorySlug, path, ref });

        let allFiles: string[] = [];

        for (const item of directoryListResponse) {
            if (isGitHubContentListFileItem(item)) {
                allFiles.push(item.path);
            } else if (isGitHubContentListDirectoryItem(item)) {
                const subDirectoryFiles = await this.resolveDirectoryRecursively({
                    repositorySlug,
                    ref,
                    path: item.path,
                });
                allFiles = allFiles.concat(subDirectoryFiles);
            }
        }

        return allFiles;
    }
}
