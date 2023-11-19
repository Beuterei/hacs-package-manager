import { BusinessError } from './businessError.exception';

export class HttpExceptionError extends BusinessError {
    public constructor(statusText: string) {
        super(`Request failed with status code '${statusText}'.`);
        this.name = 'HttpExceptionError';
    }
}
