"use client";

import { useCallback, useEffect, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface FocusModeState {
  active: boolean;
  startedAt: number | null;
  movement: number;
}

export type FocusModeEvent =
  | { type: "accepted-input"; now: number }
  | { type: "pointer-move"; now: number; movementX: number; movementY: number }
  | { type: "touch" }
  | { type: "exit" };

export const FOCUS_MOVEMENT_THRESHOLD_PX = 8;
export const FOCUS_POINTER_GRACE_MS = 300;

export const initialFocusModeState: FocusModeState = {
  active: false,
  startedAt: null,
  movement: 0,
};

export function focusModeReducer(
  state: FocusModeState,
  event: FocusModeEvent,
  enabled = true,
): FocusModeState {
  if (!enabled) return initialFocusModeState;
  if (event.type === "accepted-input") {
    if (state.active) return state;
    return { active: true, startedAt: event.now, movement: 0 };
  }
  if (!state.active) return state;
  if (event.type === "exit" || event.type === "touch")
    return initialFocusModeState;
  if (event.type === "pointer-move") {
    if (event.movementX === 0 && event.movementY === 0) return state;
    if (
      state.startedAt !== null &&
      event.now - state.startedAt < FOCUS_POINTER_GRACE_MS
    )
      return state;
    const movement =
      state.movement + Math.hypot(event.movementX, event.movementY);
    return movement >= FOCUS_MOVEMENT_THRESHOLD_PX
      ? initialFocusModeState
      : { ...state, movement };
  }
  return state;
}

export function useFocusMode(enabled: boolean) {
  const [state, setState] = useState<FocusModeState>(initialFocusModeState);

  const dispatch = useCallback(
    (event: FocusModeEvent) => {
      setState((current) => {
        const next = focusModeReducer(current, event, enabled);
        return next;
      });
    },
    [enabled],
  );
  const enter = useCallback(
    (now: number) => dispatch({ type: "accepted-input", now }),
    [dispatch],
  );
  const exit = useCallback(() => dispatch({ type: "exit" }), [dispatch]);
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") {
        dispatch({ type: "touch" });
        return;
      }
      dispatch({
        type: "pointer-move",
        now: performance.now(),
        movementX: event.movementX,
        movementY: event.movementY,
      });
    },
    [dispatch],
  );
  const onTouchStart = useCallback(
    () => dispatch({ type: "touch" }),
    [dispatch],
  );

  const effectiveState = enabled ? state : initialFocusModeState;

  useEffect(() => {
    if (effectiveState.active)
      document.body.setAttribute("data-focus-mode", "on");
    else document.body.removeAttribute("data-focus-mode");
    const chrome = document.querySelectorAll<HTMLElement>(
      "[data-focus-chrome]",
    );
    chrome.forEach((element) => {
      (element as HTMLElement & { inert: boolean }).inert =
        effectiveState.active;
    });
    return () => {
      document.body.removeAttribute("data-focus-mode");
      chrome.forEach((element) => {
        (element as HTMLElement & { inert: boolean }).inert = false;
      });
    };
  }, [effectiveState.active]);

  useEffect(() => {
    if (!effectiveState.active) return;
    const listener = (event: PointerEvent) => {
      dispatch({
        type: "pointer-move",
        now: performance.now(),
        movementX: event.movementX,
        movementY: event.movementY,
      });
    };
    window.addEventListener("pointermove", listener, {
      passive: true,
      capture: true,
    });
    return () => window.removeEventListener("pointermove", listener, true);
  }, [dispatch, effectiveState.active]);

  return { ...effectiveState, enter, exit, onPointerMove, onTouchStart };
}
