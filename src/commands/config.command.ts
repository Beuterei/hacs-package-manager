import {
    isRuntimeConfigurationKey,
    RuntimeConfigurationService,
} from '../services/runtime-configuration.service';
import { defineCommand, showUsage } from 'citty';

const setCommand = defineCommand({
    args: {
        key: {
            description: 'The key to set',
            required: true,
            type: 'positional',
        },
        value: {
            description: 'The value to set',
            required: true,
            type: 'positional',
        },
    },
    meta: {
        description: 'Set a configuration value',
        name: 'set',
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
    args: {
        key: {
            description: 'The key to get',
            required: false,
            type: 'positional',
        },
    },
    meta: {
        description: 'Get a configuration value',
        name: 'get',
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
        description: 'Configure the CLI',
        name: 'config',
    },
    subCommands: {
        get: getCommand,
        set: setCommand,
    },
});
