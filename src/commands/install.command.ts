import { DependencyService } from '../services/dependecy.service';
import { resolveBusinessException } from '../util/exception.helper';
import { Spinner } from '../util/spinner.helper';
import { defineCommand } from 'citty';

export default defineCommand({
    meta: {
        name: 'install',
        description: 'Installs all dependencies defined in the hpm.json file.',
    },
    args: {
        haConfigPath: {
            description:
                // eslint-disable-next-line no-template-curly-in-string
                'Path where to install dependencies relative to the current working directory.',
            type: 'string',
            alias: 'p',
            default: process.cwd(),
            required: false,
        },
        configPath: {
            description:
                // eslint-disable-next-line no-template-curly-in-string
                'Path to the hpm.json file relative to the current working directory.',
            type: 'string',
            alias: 'c',
            default: `${process.cwd()}/hpm.json`,
            required: false,
        },
    },
    run: async ({ args: { haConfigPath, configPath } }) => {
        const dependencyService = new DependencyService();

        const dependencies = await dependencyService.getDependencies(configPath);

        let errorOccurred = false; // Add an error flag

        const spinner = new Spinner();

        for (const [, repositorySlug] of Object.keys(dependencies).entries()) {
            if (Object.prototype.hasOwnProperty.call(dependencies, repositorySlug)) {
                const { ref } = dependencies[repositorySlug];

                try {
                    spinner.start(
                        `Installing '\u001B[36m${repositorySlug}\u001B[0m@\u001B[35m${ref}\u001B[0m'...`,
                    );

                    await dependencyService.installDependency(
                        configPath,
                        haConfigPath,
                        repositorySlug,
                    );

                    spinner.done(
                        `Installed '\u001B[36m${repositorySlug}\u001B[0m@\u001B[35m${ref}\u001B[0m'.`,
                    );
                } catch (error) {
                    spinner.fail(resolveBusinessException(error));
                    errorOccurred = true; // Set the error flag to true
                }
            }
        }

        if (errorOccurred) {
            process.exit(1); // Exit the process with a status code of 1 if an error occurred
        }
    },
});
