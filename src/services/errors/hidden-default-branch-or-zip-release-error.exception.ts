import { TypeBusinessError } from './type-business-error.exception';

export class HiddenDefaultBranchOrZipReleaseError extends TypeBusinessError {
    public constructor(repositorySlug: string, ref: string) {
        super(
            `The default branch of '${repositorySlug}@${ref}' is hidden or a zip release is used. Please provide a release tag instead.`,
        );
        this.name = 'HiddenDefaultBranchOrZipReleaseError';
    }
}
