import { BusinessError } from './businessError.exception';

export class DependencyNotFoundError extends BusinessError {
    public constructor(dependency: string) {
        super(`Could not find dependency '${dependency}'.`);
        this.name = 'DependencyNotFoundError';
    }
}
