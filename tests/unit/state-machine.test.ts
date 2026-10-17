import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "@/lib/agent/state-machine";

describe("case state machine", () => {
  it("allows a received case to become planned", () => {
    expect(canTransition("received", "planning")).toBe(true);
    expect(() => assertTransition("received", "planning")).not.toThrow();
  });

  it("rejects skipping from received to completed", () => {
    expect(canTransition("received", "completed")).toBe(false);
    expect(() => assertTransition("received", "completed")).toThrow(/Illegal case transition/);
  });

  it("allows a running case to stop safely when adapters are unavailable", () => {
    expect(canTransition("running-free-tools", "blocked")).toBe(true);
  });
});
