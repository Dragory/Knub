declare module "minimist-string" {
  interface IParsedArgs {
    [arg: string]: any;

    /**
     * If opts['--'] is true, populated with everything after the --
     */
    "--"?: string[];

    /**
     * Contains all the arguments that didn't have an option associated with them
     */
    _: string[];
  }

  function minimistString(input: string): IParsedArgs;

  export = minimistString;
}
