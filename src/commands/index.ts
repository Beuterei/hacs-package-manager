import add from './add.command';
import config from './config.command';
import type { CommandModule } from 'yargs';

export const commands = [add, config] as unknown as CommandModule[]; // I don't want to continue arguing with yargs
