import { OptionsFromSignature, SlashCommandSignature } from "./slashCommandUtils";
import { slashOptions } from "./slashCommandOptions";
import { AssertTypeEquals } from "../../testUtils";

describe("slashCommandUtils", () => {
  it("OptionsFromSignature basic functionality", () => {
    const signature = [
      slashOptions.string({ name: "required_str", description: "", required: true }),
      slashOptions.string({ name: "optional_str", description: "" }),
    ] satisfies SlashCommandSignature;

    const test1: AssertTypeEquals<OptionsFromSignature<typeof signature>["required_str"], string> = true;
    const test2: AssertTypeEquals<OptionsFromSignature<typeof signature>["required_str"], null> = false;

    const test3: AssertTypeEquals<OptionsFromSignature<typeof signature>["optional_str"], string> = true;
    const test4: AssertTypeEquals<OptionsFromSignature<typeof signature>["optional_str"], null> = true;
  });
});
