// const typeFileLookup: { [key in keyof Defaults]: string[] } = {
//     appdaemon: ['apps'],
// };

import { HttpExceptionError } from './errors/httpExceptionError.exception';
import { InvalidGitHubResponseError } from './errors/invalidGitHubResponseError.exception';
import { InvalidRefTypeError } from './errors/invalidRefTypeError.exception';
import { RuntimeConfigurationService } from './runtime-configuration.service';

interface GitHubContentBaseTypeResponse {
    path: string;
}

interface GitHubContentFileTypeResponse extends GitHubContentBaseTypeResponse {
    content: string;
    type: 'file';
}

interface GitHubContentDirectoryTypeResponse extends GitHubContentBaseTypeResponse {
    type: 'dir';
}

type GitHubContentDirectoryListResponse = Array<
    GitHubContentFileTypeResponse | GitHubContentDirectoryTypeResponse
>;

interface MatchedRef {
    matchedRef: string;
    matchedRefType: 'tag' | 'commit' | 'head';
}

const isGitHubContentBaseTypeResponse = (
    object: unknown,
): object is GitHubContentBaseTypeResponse =>
    typeof object === 'object' &&
    object !== null &&
    'path' in object &&
    typeof object.path === 'string';

const isGitHubContentFileTypeResponse = (
    object: GitHubContentBaseTypeResponse,
): object is GitHubContentFileTypeResponse =>
    'content' in object &&
    typeof object.content === 'string' &&
    'type' in object &&
    object.type === 'file';

const isGitHubContentDirectoryTypeResponse = (
    object: GitHubContentBaseTypeResponse,
): object is GitHubContentDirectoryTypeResponse => 'type' in object && object.type === 'file';

const isGitHubContentDirectoryListResponse = (
    object: unknown,
): object is GitHubContentDirectoryListResponse =>
    Array.isArray(object) &&
    object.every(
        item => isGitHubContentDirectoryTypeResponse(item) || isGitHubContentFileTypeResponse(item),
    );

export class GitHubService {
    public constructor(
        private runtimeConfigurationService = RuntimeConfigurationService.getInstance(),
    ) {}

    private async fetchContentAPI(
        repositorySlug: string,
        path: string,
        ref?: string,
    ): Promise<GitHubContentBaseTypeResponse> {
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
            throw new HttpExceptionError(response.statusText);
        }

        const jsonResponse = await response.json();

        if (!isGitHubContentBaseTypeResponse(jsonResponse)) {
            throw new InvalidGitHubResponseError();
        }

        return jsonResponse;
    }

    public async fetchFile(
        repositorySlug: string,
        filePath: string,
        ref?: string,
    ): Promise<GitHubContentFileTypeResponse> {
        const ContentBaseTypeResponse = await this.fetchContentAPI(repositorySlug, filePath, ref);

        if (!isGitHubContentFileTypeResponse(ContentBaseTypeResponse)) {
            throw new InvalidGitHubResponseError();
        }

        return ContentBaseTypeResponse;
    }

    public async fetchLatestCommit(repositorySlug: string): Promise<string> {
        const response = await fetch(
            `https://api.github.com/repos/${repositorySlug}/git/matching-refs/heads`,
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
            // TODO: extract this to a function
            !Array.isArray(jsonResponse) ||
            jsonResponse.length === 0 ||
            !jsonResponse[0].object.sha ||
            typeof jsonResponse[0].object.sha !== 'string'
        ) {
            throw new InvalidGitHubResponseError();
        }

        return jsonResponse[0].object.sha;
    }

    public async listDirectory(
        repositorySlug: string,
        directoryPath: string,
        ref?: string,
    ): Promise<GitHubContentDirectoryListResponse> {
        const ContentBaseTypeResponse = await this.fetchContentAPI(
            repositorySlug,
            directoryPath,
            ref,
        );

        if (!isGitHubContentDirectoryListResponse(ContentBaseTypeResponse)) {
            throw new InvalidGitHubResponseError();
        }

        return ContentBaseTypeResponse;
    }

    public async matchRef(repositorySlug: string, ref: string): Promise<MatchedRef> {
        const tryResolveRef = async (
            typeToCheckFor: 'tag' | 'commit' | 'head',
        ): Promise<MatchedRef | undefined> => {
            const response = await fetch(
                `https://api.github.com/repos/${repositorySlug}/git/matching-refs/${typeToCheckFor}s/${ref}`,
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
                throw new InvalidGitHubResponseError();
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
                `https://api.github.com/repos/${repositorySlug}/commits/${ref}`,
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

        throw new InvalidRefTypeError(ref);
    }
}
