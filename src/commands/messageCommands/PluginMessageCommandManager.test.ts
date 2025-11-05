import { expect } from "chai";
import { describe, it } from "mocha";
import { createMockClient } from "../../testUtils.ts";
import { type CommandRemovedEvent, PluginMessageCommandManager } from "./PluginMessageCommandManager.ts";

const noop = () => {};

describe("PluginMessageCommandManager", () => {
  it("emits lifecycle events when commands are added, replaced, and removed", () => {
    const client = createMockClient();
    const manager = new PluginMessageCommandManager(client, { prefix: "!" });

    const pluginData = {
      pluginName: "test",
      context: "guild",
      getKnubInstance: () => ({ profiler: { addDataPoint: noop } }),
    } as any;

    manager.setPluginData(pluginData);

    const addedTriggers: string[] = [];
    const removedEvents: CommandRemovedEvent<any>[] = [];

    manager.onCommandAdded(({ command }) => {
      const trigger =
        typeof command.originalTriggers[0] === "string"
          ? command.originalTriggers[0]
          : command.originalTriggers[0].source;
      addedTriggers.push(trigger);
    });

    manager.onCommandDeleted((event) => {
      removedEvents.push(event);
    });

    const blueprint = {
      type: "message" as const,
      trigger: "foo",
      permission: null,
      run: noop,
    };

    manager.add(blueprint as any);
    expect(addedTriggers).to.deep.equal(["foo"]);
    expect(removedEvents).to.have.length(0);

    const command = manager.getAll()[0]!;
    manager.remove(command.id);
    expect(removedEvents).to.have.length(1);
    expect(removedEvents[0]!.reason).to.equal("manual");

    manager.add(blueprint as any);
    expect(addedTriggers).to.deep.equal(["foo", "foo"]);

    // Re-adding should replace the previous command
    manager.add(blueprint as any);
    expect(removedEvents).to.have.length(2);
    expect(removedEvents[1]!.reason).to.equal("replaced");
    expect(addedTriggers).to.deep.equal(["foo", "foo", "foo"]);

    manager.removeByTrigger("foo");
    expect(removedEvents).to.have.length(3);
    expect(removedEvents[2]!.reason).to.equal("deleted");
  });
});
