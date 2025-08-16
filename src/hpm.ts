import { defineCommand, runMain } from 'citty';

const main = defineCommand({
    meta: {
        description: 'A package manager for HACS',
        name: 'hpm',
    },
    subCommands: {
        add: async () =>
            await import('./commands/add.command').then((resolved) => resolved.default),
        ci: async () => await import('./commands/ci.command').then((resolved) => resolved.default),
        config: async () =>
            await import('./commands/config.command').then((resolved) => resolved.default),
        remove: async () =>
            await import('./commands/remove.command').then((resolved) => resolved.default),
        ...(process.env.NODE_ENV === 'development'
            ? {
                  dev: async () =>
                      await import('./commands/dev.command').then((resolved) => resolved.default),
              }
            : {}),
    },
});

// TODO: ? Add local clan-up command for all
// TODO: ? Add local clan-up command for one dep
// TODO: ? Add param to ci command to select categories

void runMain(main);
