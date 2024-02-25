import { BusinessError } from './business-error.exception';

export class DependencyNotFoundError extends BusinessError {
    public constructor(repositorySlug: string) {
        super(`Could not find dependency '${repositorySlug}'.`);
        this.name = 'DependencyNotFoundError';
    }
}
