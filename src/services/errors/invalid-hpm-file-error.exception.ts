import { TypeBusinessError } from './type-business-error.exception';

export class InvalidHpmFileError extends TypeBusinessError {
    public constructor() {
        super('Invalid dependency file.');
        this.name = 'InvalidHpmError';
    }
}
