import { BusinessError } from '../services/errors/businessError.exception';
import { TypeBusinessError } from '../services/errors/typeBusinessError.exception';

export const resolveBusinessException = (error: unknown): string => {
    if (error instanceof BusinessError || error instanceof TypeBusinessError) {
        return error.message;
    }

    if (error instanceof Error) {
        return `Unknown error: ${error.message}`;
    }

    return 'Unknown error';
};
