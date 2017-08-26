import { BotFramework } from "./BotFramework";

// Include both, a named and default export
export default BotFramework;
export { BotFramework as Knub };

export { IConfigProvider } from "./IConfigProvider";
export { Plugin } from "./Plugin";

export { logger } from "./logger";

export { ICommandOptions } from "./CommandManager";
