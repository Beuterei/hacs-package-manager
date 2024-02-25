import { TypeBusinessError } from './type-business-error.exception';

export class InvalidCategoryError extends TypeBusinessError {
    public constructor(repositorySlug: string, category: string, ref?: string) {
        super(
            `Category of '${repositorySlug}${
                ref ? `@${ref}}` : ''
            }' is not valid. Got: ${category}.`,
        );
        this.name = 'InvalidCategoryError';
    }
}
