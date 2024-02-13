import {
    isRuntimeConfigurationKey,
    RuntimeConfigurationService,
} from '../services/runtime-configuration.service';
import { defineCommand, showUsage } from 'citty';

const setCommand = defineCommand({
    meta: {
        name: 'set',
        description: 'Set a configuration value',
    },
    args: {
        key: {
            description: 'The key to set',
            type: 'positional',
            required: true,
        },
        value: {
            description: 'The value to set',
            type: 'positional',
            required: true,
        },
    },
    run: async ({ args: { key, value } }) => {
        if (key === undefined || value === undefined) {
            await showUsage(setCommand);
            throw new Error('Invalid usage');
        }

        if (!isRuntimeConfigurationKey(key)) {
            throw new Error('Invalid config key');
        }

        const runtimeConfigurationService = RuntimeConfigurationService.getInstance();

        await runtimeConfigurationService.setRuntimeConfigurationKey(key, value);

        console.log('\u001B[32mConfig value updated.\u001B[0m');
        process.exit(0);
    },
});

const getCommand = defineCommand({
    meta: {
        name: 'get',
        description: 'Get a configuration value',
    },
    args: {
        key: {
            description: 'The key to get',
            type: 'positional',
            required: false,
        },
    },
    run: async ({ args: { key } }) => {
        const runtimeConfigurationService = RuntimeConfigurationService.getInstance();

        if (key === undefined) {
            console.log(await runtimeConfigurationService.getRuntimeConfiguration());
            process.exit(0);
        }

        if (!isRuntimeConfigurationKey(key)) {
            throw new Error('Invalid config key');
        }

        const value = await runtimeConfigurationService.getRuntimeConfigurationKey(key);

        console.log(value);
        process.exit(0);
    },
});

export default defineCommand({
    meta: {
        name: 'config',
        description: 'Configure the CLI',
    },
    subCommands: {
        set: setCommand,
        get: getCommand,
    },
});
