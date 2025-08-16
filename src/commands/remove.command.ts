import { DependencyService } from '../services/dependecy.service';
import { resolveBusinessException } from '../util/exception.helper';
import { Spinner } from '../util/spinner.helper';
import { defineCommand } from 'citty';

export default defineCommand({
    args: {
        configPath: {
            alias: 'c',
            default: `${process.cwd()}/hpm.json`,
            description: 'Path to the hpm.json file relative to the current working directory.',
            required: false,
            type: 'string',
        },
        haConfigPath: {
            alias: 'a',
            default: process.cwd(),
            description:
                'Path where to install dependencies relative to the current working directory.',
            required: false,
            type: 'string',
        },
    },
    meta: {
        description: 'Removes a particular package or multiple packages from home assistant',
        name: 'remove [DEPENDENCIES...]',
    },
    run: async ({ args: { _, configPath, haConfigPath } }) => {
        const repositorySlugs = _;

        const dependencyService = new DependencyService();
        let errorOccurred = false; // Add an error flag

        if (repositorySlugs.length === 0) {
            throw new Error('No packages provided.');
        }

        for (const [, repositorySlug] of Object.entries(repositorySlugs)) {
            const spinner = new Spinner();

            try {
                spinner.start(`Removing '\u001B[36m${repositorySlug}\u001B[0m'...`);

                await dependencyService.removeDependency(configPath, haConfigPath, repositorySlug);

                spinner.done(`Removed '\u001B[36m${repositorySlug}\u001B[37m\u001B[0m'.`);
            } catch (error) {
                spinner.fail(resolveBusinessException(error));
                errorOccurred = true; // Set the error flag to true
            }
        }

        if (errorOccurred) {
            process.exit(1); // Exit the process with a status code of 1 if an error occurred
        }
    },
});
