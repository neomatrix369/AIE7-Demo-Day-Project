export function getContainerRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector) as HTMLElement | null;
  return el ? el.getBoundingClientRect() : null;
}

export function containerAbsolutePosition(
  containerRect: DOMRect,
  relX: number,
  relY: number,
  offset: number
): { left: number; top: number } {
  return {
    left: containerRect.left + relX + offset,
    top: containerRect.top + relY + offset
  };
}

export function clampToRect(
  left: number,
  top: number,
  width: number,
  height: number,
  rect: DOMRect,
  margin: number = 10
): { left: number; top: number } {
  let cl = left;
  let ct = top;
  const rightBound = rect.left + rect.width;
  const bottomBound = rect.top + rect.height;

  if (cl + width > rightBound - margin) cl = rightBound - width - margin;
  if (ct + height > bottomBound - margin) ct = bottomBound - height - margin;
  if (cl < rect.left + margin) cl = rect.left + margin;
  if (ct < rect.top + margin) ct = rect.top + margin;

  return { left: cl, top: ct };
}


