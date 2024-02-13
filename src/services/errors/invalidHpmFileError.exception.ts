import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidHpmFileError extends TypeBusinessError {
    public constructor() {
        super('Invalid dependency file.');
        this.name = 'InvalidHpmError';
    }
}
