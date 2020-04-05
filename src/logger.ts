export type LoggerFn = (level: string, msg: string) => void;

const defaultLoggerFn: LoggerFn = (level: string, msg: string) => {
  console.log(`[${level.toUpperCase()}] ${msg}`); // tslint:disable-line
};

let currentLoggerFn: LoggerFn = defaultLoggerFn;

export function setLoggerFn(fn: LoggerFn) {
  currentLoggerFn = fn;
}

interface ILoggerObj {
  [key: string]: (msg: string) => void;
}

/**
 * The exported logger object's properties can be called to dynamically log with the specified level.
 * For example, calling logger.warn() would log a message with the level "warn".
 */
export const logger: ILoggerObj = new Proxy(
  {},
  {
    get(obj, prop) {
      return (msg: string) => {
        currentLoggerFn(prop as string, msg);
      };
    }
  }
);

export function deprecationWarning(context: string, suggestion: string = null) {
  logger.warn(
    `${context} is deprecated and will be removed in a future release.${suggestion &&
      ` ${suggestion}`} See GitHub changelog for more information.`
  );
}
