import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Recursive function to get all files in a directory
export const getFiles = (directoryPath: string): string[] => {
    const files: string[] = [];

    readdirSync(directoryPath).forEach(file => {
        const filePath = join(directoryPath, file);
        if (statSync(filePath).isDirectory()) {
            files.push(...getFiles(filePath));
        } else {
            files.push(filePath);
        }
    });

    return files;
};
