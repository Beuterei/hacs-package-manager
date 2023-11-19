import type { Argv, CommandModule, InferredOptionTypes, Options } from 'yargs';

export interface ArgsObject {
    [key: string]: string | string[];
}

export interface OptionsObject {
    [key: string]: Options;
}

export interface ModifiedCommandModule<
    // generic to pass down inherit types
    ExtendArgs extends ArgsObject,
    ExtendOptions extends OptionsObject,
    // extend the command module but omit builder and handler to put in our inherited types
    // also omit command and describe to make them required
> extends Omit<CommandModule, 'builder' | 'command' | 'describe' | 'handler'> {
    builder?: ExtendOptions | ((yargs: Argv) => unknown);
    command: string;
    describe: string;
    handler: (args: ExtendArgs & InferredOptionTypes<ExtendOptions>) => Promise<void> | void;
}

/**
 * Type helper function to register a command module
 *
 * @example <caption>Minimal command registration</caption>
 * registerCommandModule()({command: 'helloWorld', describe: 'HelloWorld', handler: () => console.log('HelloWorld')});
 * @example <caption>Command registration with options</caption>
 * registerCommandModule()({ command: 'helloWorld', describe: 'HelloWorld', builder: { name: { alias: 'n', type: 'string' }}, handler: (args) => console.log(`Hello ${args.name}`)});
 * @example <caption>Command registration with argument</caption>
 * registerCommandModule<{ name: string }>()({ command: 'helloWorld [name]', describe: 'HelloWorld', handler: (args) => console.log(`Hello ${args.name}`)});
 * @example <caption>Command registration with alias</caption>
 * registerCommandModule()({command: 'helloWorld', aliases: 'hello', describe: 'HelloWorld', handler: () => console.log('HelloWorld')});
 * @example <caption>Command registration with deprecated warning</caption>
 * registerCommandModule()({command: 'helloWorld', deprecated: true, describe: 'HelloWorld', handler: () => console.log('HelloWorld')});
 */
export const registerCommandModule =
    // wrapper function to apply extend args without loosing type inheritance


        <ExtendArgs extends ArgsObject = {}>() =>
        <ExtendOptions extends OptionsObject>(
            // require a module object and inherit the types
            module: ModifiedCommandModule<ExtendArgs, ExtendOptions>,
            // reexport the module because this just do some magic with parameter types
        ) =>
            module;
