export const isStringArray = (object: unknown): object is string[] =>
    Array.isArray(object) && object.every((item) => typeof item === 'string');
