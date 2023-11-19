import { TypeBusinessError } from './typeBusinessError.exception';

export class InvalidHacsConfigError extends TypeBusinessError {
    public constructor(dependency: string) {
        super(`HACS config of '${dependency}' is not valid.`);
        this.name = 'HacsConfigInvalidError';
    }
}
