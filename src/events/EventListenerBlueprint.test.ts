import { eventListener } from "./EventListenerBlueprint";
import { Message } from "eris";

type AssertEquals<TActual, TExpected> = TActual extends TExpected ? true : false;

// Test type inference
eventListener("messageCreate", (args) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result: AssertEquals<typeof args, { message: Message }> = true;
});
