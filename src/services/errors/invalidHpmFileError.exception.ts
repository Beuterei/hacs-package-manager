import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidHpmFileError extends TypeBusinessError {
    public constructor() {
        super("Invalid 'hpm.json' file.");
        this.name = 'InvalidHpmError';
    }
}
