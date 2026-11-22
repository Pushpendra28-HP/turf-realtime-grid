import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const KEEP_VISIBLE = 80; // px of the board that must always stay on screen
const DRAG_THRESHOLD = 5;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Wheel / drag / pinch zoom for a fixed-size board.
 * The transform is written straight to the DOM, so panning never re-renders React.
 */
export function usePanZoom(contentW, contentH) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const view = useRef({ x: 0, y: 0, scale: 1 });
  const moved = useRef(false);
  const touched = useRef(false);
  const [zoomPct, setZoomPct] = useState(100);

  const apply = useCallback((smooth = false) => {
    const el = contentRef.current;
    if (!el) return;
    const { x, y, scale } = view.current;
    el.style.transition = smooth ? 'transform 220ms cubic-bezier(.2,.8,.2,1)' : 'none';
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    setZoomPct(Math.round(scale * 100));
  }, []);

  const constrain = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const v = view.current;
    v.x = clamp(v.x, KEEP_VISIBLE - contentW * v.scale, vp.clientWidth - KEEP_VISIBLE);
    v.y = clamp(v.y, KEEP_VISIBLE - contentH * v.scale, vp.clientHeight - KEEP_VISIBLE);
  }, [contentW, contentH]);

  const fit = useCallback(
    (smooth = false) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const margin = 24;
      const scale = clamp(
        Math.min((vp.clientWidth - margin * 2) / contentW, (vp.clientHeight - margin * 2) / contentH),
        MIN_SCALE,
        1.5
      );
      view.current = {
        scale,
        x: (vp.clientWidth - contentW * scale) / 2,
        y: (vp.clientHeight - contentH * scale) / 2,
      };
      apply(smooth);
    },
    [apply, contentW, contentH]
  );

  const zoomAt = useCallback(
    (cx, cy, nextScale, smooth = false) => {
      const v = view.current;
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      const k = scale / v.scale;
      v.x = cx - (cx - v.x) * k;
      v.y = cy - (cy - v.y) * k;
      v.scale = scale;
      constrain();
      apply(smooth);
    },
    [apply, constrain]
  );

  const zoomBy = useCallback(
    (factor) => {
      const vp = viewportRef.current;
      if (!vp) return;
      touched.current = true;
      zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, view.current.scale * factor, true);
    },
    [zoomAt]
  );

  const reset = useCallback(() => {
    touched.current = false;
    fit(true);
  }, [fit]);

  // initial fit, and keep fitting on resize until the player has moved the board themselves
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    fit();
    const observer = new ResizeObserver(() => {
      if (!touched.current) fit();
    });
    observer.observe(vp);
    return () => observer.disconnect();
  }, [fit]);

  // wheel needs a non-passive listener, otherwise the page scrolls while zooming
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onWheel = (e) => {
      e.preventDefault();
      touched.current = true;
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const rect = vp.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, view.current.scale * Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015)));
    };

    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // one finger / mouse drags, two fingers pinch
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const pointers = new Map();
    let gesture = null;

    const takeSnapshot = () => {
      const pts = [...pointers.values()];
      const v = view.current;
      if (pts.length === 1) {
        gesture = { type: 'pan', px: pts[0].x, py: pts[0].y, x: v.x, y: v.y };
      } else if (pts.length >= 2) {
        const [a, b] = pts;
        const rect = vp.getBoundingClientRect();
        gesture = {
          type: 'pinch',
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          cx: (a.x + b.x) / 2 - rect.left,
          cy: (a.y + b.y) / 2 - rect.top,
          scale: v.scale,
          x: v.x,
          y: v.y,
        };
      } else {
        gesture = null;
      }
    };

    const onMove = (e) => {
      if (!pointers.has(e.pointerId) || !gesture) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const v = view.current;

      if (gesture.type === 'pan') {
        const dx = e.clientX - gesture.px;
        const dy = e.clientY - gesture.py;
        if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        if (!moved.current) vp.style.cursor = 'grabbing';
        moved.current = true;
        touched.current = true;
        v.x = gesture.x + dx;
        v.y = gesture.y + dy;
      } else {
        const [a, b] = [...pointers.values()];
        const scale = clamp(gesture.scale * (Math.hypot(a.x - b.x, a.y - b.y) / gesture.dist), MIN_SCALE, MAX_SCALE);
        const k = scale / gesture.scale;
        moved.current = true;
        touched.current = true;
        v.scale = scale;
        v.x = gesture.cx - (gesture.cx - gesture.x) * k;
        v.y = gesture.cy - (gesture.cy - gesture.y) * k;
      }
      constrain();
      apply();
    };

    const onUp = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        vp.style.cursor = '';
        gesture = null;
      } else {
        takeSnapshot();
      }
    };

    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (pointers.size === 0) moved.current = false;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      takeSnapshot();
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };

    vp.addEventListener('pointerdown', onDown);
    return () => {
      vp.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [apply, constrain]);

  return {
    viewportRef,
    contentRef,
    zoomPct,
    zoomIn: () => zoomBy(1.3),
    zoomOut: () => zoomBy(1 / 1.3),
    reset,
    // true when the pointer that just went up was a drag, so the click should be ignored
    wasDragged: () => moved.current,
  };
}
