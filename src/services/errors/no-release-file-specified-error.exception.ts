import { TypeBusinessError } from './type-business-error.exception';

export class NoReleaseFileSpecifiedError extends TypeBusinessError {
    public constructor(repositorySlug: string, ref: string) {
        super(`No release file specified for '${repositorySlug}@${ref}'.'`);
        this.name = 'NoReleaseFileSpecifiedError';
    }
}
