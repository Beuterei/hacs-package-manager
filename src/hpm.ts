import { defineCommand, runMain } from 'citty';

const main = defineCommand({
    meta: {
        name: 'hpm',
        description: 'A package manager for HACS',
    },
    subCommands: {
        add: async () => await import('./commands/add.command').then(resolved => resolved.default),
        ci: async () => await import('./commands/ci.command').then(resolved => resolved.default),
        remove: async () =>
            await import('./commands/remove.command').then(resolved => resolved.default),
        config: async () =>
            await import('./commands/config.command').then(resolved => resolved.default),
        ...(process.env.NODE_ENV === 'development'
            ? {
                  dev: async () =>
                      await import('./commands/dev.command').then(resolved => resolved.default),
              }
            : {}),
    },
});

void runMain(main);
