import * as winston from "winston";

export const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp() {
        return new Date().toISOString();
      },

      formatter(opts) {
        let meta = opts.meta ? JSON.stringify(opts.meta) : null;
        if (meta === "{}") {
          meta = null;
        }

        return `[${opts.timestamp()}] [${opts.level.toUpperCase()}] ${opts.message || ""} ${
          meta ? "\n\t" + meta : ""
        }`.trim();
      }
    })
  ]
});
