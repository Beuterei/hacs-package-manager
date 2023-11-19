import { RuntimeConfigurationService } from '../services/runtime-configuration.service';
import { registerCommandModule } from '../shared/commandModule';
import { resolveBusinessException } from '../util/exception.helper';

export default registerCommandModule<{
    command?: string;
    options?: string[];
}>()({
    command: 'config [command] [options..]',
    describe: 'Configure the CLI',
    builder: yargs => {
        yargs.positional('command', {
            describe: 'The command to execute',
            choices: ['set', 'get'],
        });
        yargs.positional('options', {
            describe: 'The options for the command',
        });
    },
    handler: async argv => {
        try {
            if (argv.command === 'set') {
                const [key, value] = argv.options ?? [];

                if (key === undefined || value === undefined) {
                    console.log('\u001B[31mNo key or value provided.\u001B[0m');
                    process.exit(1);
                }

                const runtimeConfigurationService = RuntimeConfigurationService.getInstance();

                await runtimeConfigurationService.setRuntimeConfigurationKey(key, value);
                process.exit(0);
            }

            if (argv.command === 'get') {
                const [key] = argv.options ?? [];

                const runtimeConfigurationService = RuntimeConfigurationService.getInstance();

                if (key === undefined) {
                    console.log(await runtimeConfigurationService.getRuntimeConfiguration());
                    process.exit(0);
                }

                const value = await runtimeConfigurationService.getRuntimeConfigurationKey(key);

                console.log(value);
                process.exit(0);
            }

            console.log('\u001B[31mInvalid command.\u001B[0m');
            process.exit(1);
        } catch (error) {
            console.log(`\u001B[31m${resolveBusinessException(error)}\u001B[0m`);

            process.exit(1);
        }
    },
});
