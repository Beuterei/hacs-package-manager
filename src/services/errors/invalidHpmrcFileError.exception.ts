import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidHpmrcFileError extends TypeBusinessError {
    public constructor() {
        super("Invalid '.hpmrc' file.");
        this.name = 'InvalidHpmrcFileError';
    }
}
