export const mochaHooks = {
  beforeAll() {
    process.on("uncaughtException", (err) => {
      throw err;
    });
    process.on("unhandledRejection", (err) => {
      throw err;
    });
  },
};
