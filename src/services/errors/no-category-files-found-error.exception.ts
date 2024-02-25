import type { HpmDependency } from '../../shared/hpm';
import { TypeBusinessError } from './type-business-error.exception';

export class NoCategoryFilesFoundError extends TypeBusinessError {
    public constructor(repositorySlug: string, ref: string, category: HpmDependency['category']) {
        super(`No files found for '${repositorySlug}@${ref}' in ${category}.`);
        this.name = 'NoCategoryFilesFoundError';
    }
}
