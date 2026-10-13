import { describe, expect, test } from "bun:test";
import { pinIntent } from "./pin-intent";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function recorder() {
  const loaded: string[] = [];
  return { loaded, intent: pinIntent((id) => loaded.push(id), 20) };
}

describe("pinIntent", () => {
  test("resting loads after the delay", async () => {
    const { loaded, intent } = recorder();
    intent.rest("AB12C");
    expect(loaded).toEqual([]);
    await wait(40);
    expect(loaded).toEqual(["AB12C"]);
  });

  test("leaving before the delay loads nothing", async () => {
    const { loaded, intent } = recorder();
    intent.rest("AB12C");
    intent.leave();
    await wait(40);
    expect(loaded).toEqual([]);
  });

  test("sweeping across pins loads only the one the pointer stops on", async () => {
    const { loaded, intent } = recorder();
    for (const id of ["AAAA1", "AAAA2", "AAAA3"]) intent.rest(id);
    await wait(40);
    expect(loaded).toEqual(["AAAA3"]);
  });

  test("a press loads at once and cancels a pending rest", async () => {
    const { loaded, intent } = recorder();
    intent.rest("AAAA1");
    intent.press("AAAA2");
    expect(loaded).toEqual(["AAAA2"]);
    await wait(40);
    expect(loaded).toEqual(["AAAA2"]);
  });
});
