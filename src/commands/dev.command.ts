/* eslint-disable unicorn/prevent-abbreviations */
// ? This is a module for local development purposes only. It is not included in the production build.
import { CacheService } from '../services/cache.service';
import { $ } from 'bun';
import { defineCommand } from 'citty';

const add = defineCommand({
    args: {
        deleteHpm: {
            default: false,
            description: 'Delete the hpm file before adding the dependencies.',
            type: 'boolean',
        },
        type: {
            description: 'The type of dependencies to add.',
            required: true,
            type: 'positional',
        },
    },
    meta: {
        description: 'Tries to add all dependencies of the defined type.',
        name: 'add',
    },
    run: async ({ args: { deleteHpm, type } }) => {
        const configPath = `${process.cwd()}/hpm.json`;

        if (deleteHpm) {
            const hpmFile = Bun.file(configPath);

            if (await hpmFile.exists()) {
                await Bun.$`rm ${hpmFile}`;
            }
        }

        if (
            type !== 'appdaemon' &&
            type !== 'integration' &&
            type !== 'netdaemon' &&
            type !== 'plugin' &&
            type !== 'pythonScript' &&
            type !== 'template' &&
            type !== 'theme'
        ) {
            throw new Error('Invalid type.');
        }

        const cacheService = CacheService.getInstance();

        const dependencies = (await cacheService.getDefaultsCache()).defaults[type];

        await $`${process.argv[0]} ${process.argv[1]} add ${{ raw: dependencies.join(' ') }}`;
    },
});

const test = defineCommand({
    meta: {
        description: 'Test command for local development purposes.',
        name: 'test',
    },
    subCommands: {
        add,
    },
});

export default defineCommand({
    meta: {
        description: 'Collection of commands for local development purposes.',
        name: 'dev',
    },
    subCommands: {
        test,
    },
});
