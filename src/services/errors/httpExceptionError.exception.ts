import { BusinessError } from './businessError.exception';

export class HttpExceptionError extends BusinessError {
    public constructor(statusText: string, repositorySlug: string, path: string, ref?: string) {
        super(
            `Request failed with status code '${statusText}' for ${repositorySlug}${
                ref ? `@${ref}` : ''
            } with the path '${path}'.`,
        );
        this.name = 'HttpExceptionError';
    }
}
