export const LOGICAL_WIDTH = 600;
export const LOGICAL_HEIGHT = 300;

export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function getRenderScale(width: number, height: number): number {
  return Math.min(width / LOGICAL_WIDTH, height / LOGICAL_HEIGHT);
}

export function toLogicalPoint(
  clientX: number,
  clientY: number,
  rect: CanvasRect,
): { x: number; y: number } {
  const scaleX = LOGICAL_WIDTH / Math.max(rect.width, 1);
  const scaleY = LOGICAL_HEIGHT / Math.max(rect.height, 1);
  return {
    x: Math.max(0, Math.min(LOGICAL_WIDTH, Math.round((clientX - rect.left) * scaleX))),
    y: Math.max(0, Math.min(LOGICAL_HEIGHT, Math.round((clientY - rect.top) * scaleY))),
  };
}
