import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidRefTypeError extends TypeBusinessError {
    public constructor(repositorySlug: string, ref: string) {
        super(`For '${ref}' no matching tag, commit, or head in '${repositorySlug} was found'.`);
        this.name = 'InvalidRefTypeError';
    }
}
