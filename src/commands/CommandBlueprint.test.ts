import { command } from "./CommandBlueprint";
import { number, string } from "knub-command-manager";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

// Test type inference
command(
  "cmd",
  {
    foo: string(),
    bar: number(),
  },
  (args) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result: AssertEquals<typeof args, { foo: string; bar: number }> = true;
  }
);
