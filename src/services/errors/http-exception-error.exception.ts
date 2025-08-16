import { BusinessError } from './business-error.exception';

export class HttpExceptionError extends BusinessError {
    public status: number;

    public constructor(status: number, repositorySlug: string, path?: string, ref?: string) {
        super(
            `Request failed with status code '${status}' for '${repositorySlug}${
                ref ? `@${ref}` : ''
            }'${path ? ` with the path '${path}'.` : '.'}`,
        );
        this.name = 'HttpExceptionError';
        this.status = status;
    }
}
