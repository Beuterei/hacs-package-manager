import {
    isRuntimeConfigurationKey,
    RuntimeConfigurationService,
} from '../services/runtime-configuration.service';
import { defineCommand, showUsage } from 'citty';

const setCommand = defineCommand({
    meta: {
        name: 'set [key] [value]',
        description: 'Set a configuration value',
    },
    run: async ({ args }) => {
        const [key, value] = args._;

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
        name: 'get [key]',
        description: 'Get a configuration value',
    },
    run: async ({ args }) => {
        const [key] = args._;

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
