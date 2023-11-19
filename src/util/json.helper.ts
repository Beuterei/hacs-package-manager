import { isStringArray } from '../shared/typeguards';

export const parseJsonToStringArray = (content: string): string[] => {
    const array = JSON.parse(content);
    if (!isStringArray(array)) {
        throw new Error(`Failed to parse json: ${content}`);
    }

    return array;
};
