import { commands } from './commands';
import yargs from 'yargs';

void yargs(Bun.argv.slice(2))
    .scriptName('hpm')
    .alias('v', 'version')
    .command(commands)
    .demandCommand()
    .alias('h', 'help')
    .help('help')
    .epilogue('for more information, look at the readme').argv;
