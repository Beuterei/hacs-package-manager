import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidCategoryError extends TypeBusinessError {
    public constructor(repositorySlug: string, ref: string, category: string) {
        super(`Category of '${repositorySlug}@${ref}' is not valid. Got: ${category}.`);
        this.name = 'InvalidCategoryError';
    }
}
