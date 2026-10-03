import { describe, expect, it } from "vitest";

import {
  getCaretPosition,
  getCaretScrollTop,
  TYPING_LINE_HEIGHT_PX,
} from "@/components/typing/caret";
import {
  armTabRestart,
  getTabRestartAction,
  isTabRestartArmed,
  TAB_RESTART_HINT_MS,
} from "@/components/typing/interaction";

describe("typing caret layout", () => {
  it("uses mocked offset metrics in the shared content coordinate space", () => {
    expect(
      getCaretPosition({
        offsetHeight: 42,
        offsetLeft: 128,
        offsetTop: 112,
        offsetWidth: 0,
      }),
    ).toEqual({ height: 42, x: 128, y: 112 });
  });

  it("keeps the first line at zero and later lines near the middle", () => {
    expect(getCaretScrollTop(8, 168)).toBe(0);
    expect(getCaretScrollTop(TYPING_LINE_HEIGHT_PX * 3, 168)).toBe(112);
  });
});

describe("Tab restart affordance", () => {
  it("arms for two seconds, restarts on Enter, and cancels on another key", () => {
    const armedAt = armTabRestart(100);
    expect(isTabRestartArmed(armedAt, 100 + TAB_RESTART_HINT_MS - 1)).toBe(
      true,
    );
    expect(getTabRestartAction("Enter", armedAt, 500)).toBe("restart");
    expect(getTabRestartAction("a", armedAt, 500)).toBe("cancel");
    expect(
      getTabRestartAction("Enter", armedAt, 100 + TAB_RESTART_HINT_MS),
    ).toBe(null);
  });
});
