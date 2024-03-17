import { DependencyService } from '../services/dependecy.service';
import { resolveBusinessException } from '../util/exception.helper';
import { Spinner } from '../util/spinner.helper';
import { defineCommand } from 'citty';

export default defineCommand({
    meta: {
        name: 'add [DEPENDENCIES...]',
        description: 'Adds a particular package or multiple packages to home assistant',
    },
    args: {
        configPath: {
            description: 'Path to the hpm.json file relative to the current working directory.',
            type: 'string',
            alias: 'c',
            default: 'hpm.json',
            required: false,
        },
    },
    run: async ({ args: { _, configPath } }) => {
        const dependencies = _;

        const dependencyService = new DependencyService();
        let errorOccurred = false; // Add an error flag

        if (dependencies.length === 0) {
            throw new Error('No packages provided.');
        }

        for (const [, dependency] of Object.entries(dependencies)) {
            const spinner = new Spinner();

            try {
                const [repositorySlug, unresolvedRef] = dependency.split('@') as [
                    string,
                    string | undefined,
                ];

                spinner.start(
                    `Adding '\u001B[36m${repositorySlug}${
                        unresolvedRef ? `\u001B[37m@\u001B[35m${unresolvedRef}` : ''
                    }\u001B[0m'...`,
                );

                const hpmDependency = await dependencyService.addDependency(
                    configPath,
                    repositorySlug,
                    unresolvedRef,
                );

                const refString =
                    hpmDependency.refType === 'commit'
                        ? hpmDependency.ref.slice(0, 8)
                        : hpmDependency.ref;

                if (hpmDependency.category === 'netdaemon') {
                    spinner.doneWithWarning(
                        `Added '\u001B[36m${repositorySlug}\u001B[37m@\u001B[35m${refString}\u001B[33m'. Be careful, netdaemon dependencies are deprecated.`,
                    );
                    continue;
                }

                spinner.done(
                    `Added '\u001B[36m${repositorySlug}\u001B[37m@\u001B[35m${refString}\u001B[0m'.`,
                );
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
