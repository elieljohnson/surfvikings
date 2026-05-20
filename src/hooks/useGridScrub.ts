// Touch-and-drag scrubber for a 2D grid (e.g. the 7-day × 24-hour heatmap
// on the Forecast tab). Sibling to useChartScrub — same Pointer Events
// principles, two-axis index math.
//
// What it does:
//   - Tap a cell         → pin tooltip, sticky until dismissed
//   - Tap outside        → dismiss (scoped to the overlay surface)
//   - Tap already-pinned → toggle off
//   - Drag in any 2D direction → continuous scrub, snaps cell-by-cell,
//                          optional haptic per cell change on Android
//   - Mouse hover        → transient preview without pinning
//
// Lessons baked in (same as useChartScrub):
//   - Pointer Events (not Touch Events) for unified mouse+touch+pen
//   - setPointerCapture so the scrub survives finger drift off the surface
//   - 4px dead zone to distinguish tap from drag
//   - lastCellRef gating so we only setState (and vibrate) on cell change
//   - ignore secondary pointers (e.isPrimary)
//   - pointercancel cleanup for OS interrupts

import { useEffect, useRef, useState } from 'react';

interface UseGridScrubArgs {
  cols: number;
  rows: number;
}

export interface GridCell { row: number; col: number }

interface UseGridScrubReturn {
  /** Currently-active cell (pinned via tap OR hovered via mouse). */
  active: GridCell | null;
  /** True only during an active drag — drives any "scrub guideline" UI. */
  isDragging: boolean;
  /** Attach to the visible grid surface. Outside-tap dismiss scopes here. */
  surfaceRef: React.MutableRefObject<HTMLDivElement | null>;
  /** Attach to the transparent overlay div that captures pointer events. */
  overlayRef: React.MutableRefObject<HTMLDivElement | null>;
  /** Spread onto the overlay div. Bundles all pointer handlers + the
   *  touch-action: none style that keeps scroll-vs-scrub from fighting. */
  overlayProps: React.HTMLAttributes<HTMLDivElement> & { style: React.CSSProperties };
}

function sameCell(a: GridCell | null, b: GridCell | null): boolean {
  if (!a || !b) return a === b;
  return a.row === b.row && a.col === b.col;
}

export function useGridScrub({ cols, rows }: UseGridScrubArgs): UseGridScrubReturn {
  // `selected` = pinned via tap (sticky until dismiss).
  // `hovered`  = mouse-only preview (transient).
  // `active`   = whichever is set; selected wins when both.
  const [selected, setSelected] = useState<GridCell | null>(null);
  const [hovered, setHovered] = useState<GridCell | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const active = selected ?? hovered;

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const prevSelectedRef = useRef<GridCell | null>(null);
  const lastCellRef = useRef<GridCell | null>(null);
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);

  // Outside-tap dismiss. Scoped to the grid surface so taps anywhere
  // outside it (including the tooltip's reserved padding) dismiss.
  useEffect(() => {
    if (!selected) return;
    const handler = (e: PointerEvent) => {
      if (surfaceRef.current && !surfaceRef.current.contains(e.target as Node)) {
        setSelected(null);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [selected]);

  function cellFromClient(clientX: number, clientY: number): GridCell | null {
    const el = overlayRef.current;
    if (!el || cols === 0 || rows === 0) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    const col = Math.max(0, Math.min(cols - 1, Math.floor(fx * cols)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor(fy * rows)));
    return { row, col };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!e.isPrimary) return; // multi-touch: ignore second finger
    const cell = cellFromClient(e.clientX, e.clientY);
    if (!cell) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    prevSelectedRef.current = selected;
    tapStartRef.current = { x: e.clientX, y: e.clientY };
    lastCellRef.current = cell;
    setIsDragging(false);
    setSelected(cell);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const captured = e.currentTarget.hasPointerCapture(e.pointerId);
    if (!captured) {
      // Not actively scrubbing — desktop hover preview.
      if (e.pointerType === 'mouse') setHovered(cellFromClient(e.clientX, e.clientY));
      return;
    }
    // Promote to dragging once the finger moves past the 4px dead zone.
    const start = tapStartRef.current;
    if (start && !isDragging) {
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx > 4 || dy > 4) setIsDragging(true);
    }
    const cell = cellFromClient(e.clientX, e.clientY);
    if (cell && !sameCell(cell, lastCellRef.current)) {
      lastCellRef.current = cell;
      setSelected(cell);
      // Optional haptic — Chrome on Android honors this; iOS no-ops.
      navigator.vibrate?.(8);
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const wasDrag = isDragging;
    const wasAlreadySelected = prevSelectedRef.current;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // Tap on already-pinned cell toggles it off. A drag that ends back at
    // the same cell does NOT toggle (user was scrubbing, not tapping).
    if (!wasDrag) {
      const cell = cellFromClient(e.clientX, e.clientY);
      if (cell && sameCell(cell, wasAlreadySelected)) setSelected(null);
    }
    setIsDragging(false);
    tapStartRef.current = null;
  }

  function onPointerLeave(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse') setHovered(null);
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    tapStartRef.current = null;
  }

  return {
    active,
    isDragging,
    surfaceRef,
    overlayRef,
    overlayProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
      style: {
        touchAction: 'none',
        cursor: 'pointer',
        // Suppress iOS Safari's text-selection + callout popup ("Copy /
        // Look Up") that otherwise fires on long-press during a scrub.
        // touch-action: none only handles scroll gestures; selection
        // requires this separate set of WebKit-specific properties.
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      },
    },
  };
}
