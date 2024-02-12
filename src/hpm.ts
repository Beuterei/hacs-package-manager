import { description, version } from '../package.json';
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
    meta: {
        name: 'hpm',
        version,
        description,
    },
    subCommands: {
        add: async () => await import('./commands/add.command').then(resolved => resolved.default),
        config: async () =>
            await import('./commands/config.command').then(resolved => resolved.default),
    },
});

void runMain(main);
