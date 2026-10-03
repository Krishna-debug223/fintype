export const TYPING_LINE_HEIGHT_PX = 56;

export interface CaretAnchorMetrics {
  offsetHeight: number;
  offsetLeft: number;
  offsetTop: number;
  offsetWidth: number;
}

export interface CaretPosition {
  height: number;
  x: number;
  y: number;
}

/**
 * The anchor and caret live in the same positioned lines container. Using
 * offset* values keeps the caret in content coordinates while the viewport
 * scrolls, avoiding viewport-rect drift during wrapped-line transitions.
 */
export function getCaretPosition(
  anchor: CaretAnchorMetrics,
  fallbackHeight = TYPING_LINE_HEIGHT_PX * 0.6,
): CaretPosition {
  return {
    x: anchor.offsetLeft,
    y: anchor.offsetTop,
    height: anchor.offsetHeight || fallbackHeight,
  };
}

/** Keep the active line near the middle, while leaving the first lines at 0. */
export function getCaretScrollTop(
  caretTop: number,
  viewportHeight: number,
  lineHeight = TYPING_LINE_HEIGHT_PX,
): number {
  const lineTop = Math.floor(caretTop / lineHeight) * lineHeight;
  const middleOffset = Math.max(0, (viewportHeight - lineHeight) / 2);
  return Math.max(0, lineTop - middleOffset);
}
