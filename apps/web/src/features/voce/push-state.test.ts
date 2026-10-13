import { expect, test } from "bun:test";
import { pushState, type PushFacts } from "./push-state";

const ready: PushFacts = {
  supported: true,
  ios: false,
  standalone: false,
  configured: true,
  permission: "default",
  subscribed: false,
};

test("an ordinary browser: off until subscribed with permission", () => {
  expect(pushState(ready)).toBe("off");
  expect(pushState({ ...ready, permission: "granted", subscribed: true })).toBe("on");
  // A subscription without permission (revoked in settings) isn't on.
  expect(pushState({ ...ready, permission: "default", subscribed: true })).toBe("off");
});

test("an iPhone needs the installed app first, whatever else holds", () => {
  expect(pushState({ ...ready, ios: true })).toBe("install");
  expect(pushState({ ...ready, ios: true, standalone: true })).toBe("off");
});

test("blocked, unconfigured and unsupported, in that order of what can be done", () => {
  expect(pushState({ ...ready, permission: "denied" })).toBe("blocked");
  expect(pushState({ ...ready, configured: false, permission: "denied" })).toBe("unconfigured");
  expect(pushState({ ...ready, supported: false })).toBe("unsupported");
});
