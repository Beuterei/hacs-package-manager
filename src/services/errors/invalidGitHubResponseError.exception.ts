import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidGitHubResponseError extends TypeBusinessError {
    public constructor() {
        super('Invalid GitHub response.');
        this.name = 'InvalidGitHubResponseError';
    }
}
