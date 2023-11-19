import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidRefTypeError extends TypeBusinessError {
    public constructor(ref: string) {
        super(`Ref '${ref}' is not a tag, commit, or head.`);
        this.name = 'InvalidRefTypeError';
    }
}
