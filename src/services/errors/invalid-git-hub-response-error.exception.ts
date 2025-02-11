import { TypeBusinessError } from './type-business-error.exception';

export class InvalidGitHubResponseError extends TypeBusinessError {
    public constructor(repositorySlug: string, ref?: string) {
        super(`Invalid GitHub response for '${repositorySlug}${ref ? `@${ref}` : ''}'.`);
        this.name = 'InvalidGitHubResponseError';
    }
}
