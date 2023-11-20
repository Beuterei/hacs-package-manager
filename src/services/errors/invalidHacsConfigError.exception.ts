import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidHacsConfigError extends TypeBusinessError {
    public constructor(repositorySlug: string, ref: string) {
        super(`HACS config of '${repositorySlug}@${ref}' is not valid.`);
        this.name = 'HacsConfigInvalidError';
    }
}
