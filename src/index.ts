import "reflect-metadata";

import { Knub } from "./Knub";

// Include both, a named and default export
export default Knub;
export { Knub };

export { IConfigProvider } from "./IConfigProvider";
export { Plugin, BarePlugin } from "./Plugin";
export { GlobalPlugin } from "./GlobalPlugin";

export { CommandDecorator as command, OnEventDecorator as onEvent } from "./commandUtils";

export { logger } from "./logger";

export { ICommandOptions } from "./CommandManager";
