// @ts-check

import { auto } from '@beuluis/eslint-config';
import { config } from 'typescript-eslint';

export default config(
    auto,
    {
        rules: {
            'import/extensions': 'off',
            'no-console': 'off',
        },
    },
    {
        // For global ignores don't define other keys here. Adapt as needed.
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/appdaemon/**',
            '**/custom_components/**',
            '**/netdaemon/**',
            '**/www/**',
            '**/python_scripts/**',
            '**/custom_templates/**',
            '**/themes/**',
            '**/hpm*.json',
        ],
    },
);
