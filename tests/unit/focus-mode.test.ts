import { describe, expect, it } from "vitest";

import {
  FOCUS_POINTER_GRACE_MS,
  FOCUS_MOVEMENT_THRESHOLD_PX,
  focusModeReducer,
  initialFocusModeState,
} from "@/components/typing/focus-mode";

describe("focus mode state machine", () => {
  it("enters only after an accepted character", () => {
    expect(
      focusModeReducer(initialFocusModeState, {
        type: "pointer-move",
        now: 0,
        movementX: 20,
        movementY: 0,
      }),
    ).toEqual(initialFocusModeState);
    const active = focusModeReducer(initialFocusModeState, {
      type: "accepted-input",
      now: 100,
    });
    expect(active.active).toBe(true);
    expect(
      focusModeReducer(active, {
        type: "pointer-move",
        now: 100 + FOCUS_POINTER_GRACE_MS - 1,
        movementX: 20,
        movementY: 0,
      }).active,
    ).toBe(true);
  });

  it("exits after cumulative real movement and on lifecycle events", () => {
    let state = focusModeReducer(initialFocusModeState, {
      type: "accepted-input",
      now: 100,
    });
    state = focusModeReducer(state, {
      type: "pointer-move",
      now: 500,
      movementX: 3,
      movementY: 0,
    });
    expect(state.active).toBe(true);
    state = focusModeReducer(state, {
      type: "pointer-move",
      now: 501,
      movementX: 0,
      movementY: 0,
    });
    expect(state.active).toBe(true);
    state = focusModeReducer(state, {
      type: "pointer-move",
      now: 502,
      movementX: FOCUS_MOVEMENT_THRESHOLD_PX - 3,
      movementY: 0,
    });
    expect(state.active).toBe(false);
    state = focusModeReducer(
      { active: true, startedAt: 1, movement: 0 },
      { type: "touch" },
    );
    expect(state).toEqual(initialFocusModeState);
  });

  it("never enters when disabled", () => {
    expect(
      focusModeReducer(
        initialFocusModeState,
        { type: "accepted-input", now: 1 },
        false,
      ),
    ).toEqual(initialFocusModeState);
  });
});
