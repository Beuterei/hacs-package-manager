import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidHpmrcKeyError extends TypeBusinessError {
    public constructor(key: string) {
        super(`Key '${key}' is not valid.`);
        this.name = 'InvalidHpmrcKeyError';
    }
}
