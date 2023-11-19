import { DependencyService } from '../services/dependecy.service';
import { registerCommandModule } from '../shared/commandModule';
import type { HpmDependency } from '../shared/hpm';
import { resolveBusinessException } from '../util/exception.helper';
import { Spinner } from '../util/spinner.helper';

export default registerCommandModule<{
    dependencies: string[];
}>()({
    command: 'add [dependencies..]',
    describe: 'Adds a particular package to home assistant',
    handler: async argv => {
        const dependencyService = new DependencyService();

        const dependencies = argv.dependencies ?? [];

        if (dependencies.length === 0) {
            throw new Error('No packages provided.');
        }

        for (const [, dependency] of Object.entries(dependencies)) {
            const spinner = new Spinner();
            spinner.start(`Adding \u001B[36m${dependency}\u001B[0m...`);

            try {
                const [repositorySlug, unresolvedRef] = dependency.split('@') as [
                    string,
                    string | undefined,
                ];

                const defaultsType = await dependencyService.getDefaultsType(repositorySlug);

                const { ref, refType } = await dependencyService.getRefAndType(
                    repositorySlug,
                    unresolvedRef,
                );

                const hpmDependency: HpmDependency = {
                    ref,
                    refType,
                    hacsConfig: await dependencyService.getHacsConfig(repositorySlug, ref),
                };

                await dependencyService.addDependency(repositorySlug, hpmDependency);

                const refString = refType === 'commit' ? ref.slice(0, 8) : ref;

                spinner.done(`Added \u001B[36m'${repositorySlug}@${refString}'\u001B[0m.`);
            } catch (error) {
                spinner.fail(resolveBusinessException(error));

                process.exit(1);
            }
        }
    },
});
