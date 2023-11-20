import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidRefTypeError extends TypeBusinessError {
    public constructor(repositorySlug: string, ref: string) {
        super(`Ref '${ref}' is not a tag, commit, or head in ${repositorySlug}.`);
        this.name = 'InvalidRefTypeError';
    }
}
