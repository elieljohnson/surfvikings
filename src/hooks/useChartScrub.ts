// Touch-and-drag scrubber for a discrete bar chart. Ported from Helios's
// drag-to-scrub-pattern.md (which itself adapts Rauno Freiberg's graph-
// slider via Pointer Events best practices).
//
// What it does:
//   - Tap a bar          → pin tooltip, sticky until dismissed
//   - Tap outside        → dismiss (scoped to the chart surface, not the
//                          outer wrapper, so taps in reserved padding
//                          correctly count as outside)
//   - Tap already-pinned → toggle off
//   - Touch-and-drag     → continuous scrub, snaps bar-by-bar, optional
//                          haptic per bar on Android (no-op on iOS)
//   - Mouse hover        → transient preview without pinning
//
// Lessons baked in:
//   - Pointer Events (not Touch Events) for unified mouse+touch+pen
//   - setPointerCapture so the scrub survives finger drift off the chart
//   - 4px dead zone to distinguish tap from drag
//   - lastIndexRef gating so we only setState (and vibrate) on bar change
//   - ignore secondary pointer (e.isPrimary check) to skip multi-touch
//   - pointercancel cleanup for OS interrupts (notifications, palm reject)

import { useEffect, useRef, useState } from 'react';

interface UseChartScrubArgs {
  itemCount: number;
}

interface UseChartScrubReturn<T extends Element> {
  /** Currently-active item index (pinned via tap OR hovered via mouse). */
  active: number | null;
  /** True only during an active drag — drives the scrub-guideline visibility. */
  isDragging: boolean;
  /** Attach to the SVG element. Outside-tap dismiss scopes here, so any tap
   *  outside this element (including the reserved tooltip padding) dismisses. */
  surfaceRef: React.MutableRefObject<T | null>;
  /** Attach to the transparent overlay rect that captures pointer events. */
  overlayRef: React.MutableRefObject<SVGRectElement | null>;
  /** Spread onto the overlay rect. Bundles all pointer handlers + the
   *  `touch-action: none` style that keeps vertical finger movement from
   *  scrolling the page during a horizontal scrub. */
  overlayProps: React.SVGAttributes<SVGRectElement> & { style: React.CSSProperties };
}

export function useChartScrub<T extends Element>({
  itemCount,
}: UseChartScrubArgs): UseChartScrubReturn<T> {
  // `selected` = pinned via tap (sticky until dismiss).
  // `hovered`  = mouse-only preview (transient).
  // `active`   = whichever is set; selected wins when both.
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const active = selected ?? hovered;

  const surfaceRef = useRef<T | null>(null);
  const overlayRef = useRef<SVGRectElement | null>(null);
  const prevSelectedRef = useRef<number | null>(null);
  const lastIndexRef = useRef<number | null>(null);
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);

  // Outside-tap dismiss. Scoped to the SVG surface, not any outer wrapper —
  // tooltip lives in the wrapper's negative space and has pointer-events:
  // none, so taps on the tooltip pass through and correctly dismiss.
  useEffect(() => {
    if (selected == null) return;
    const handler = (e: PointerEvent) => {
      if (surfaceRef.current && !surfaceRef.current.contains(e.target as Node)) {
        setSelected(null);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [selected]);

  function indexFromClientX(clientX: number): number | null {
    const el = overlayRef.current;
    if (!el || itemCount === 0) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return null;
    const fraction = (clientX - rect.left) / rect.width;
    const i = Math.floor(fraction * itemCount);
    return Math.max(0, Math.min(itemCount - 1, i));
  }

  function onPointerDown(e: React.PointerEvent<SVGRectElement>) {
    if (!e.isPrimary) return; // multi-touch: ignore second finger
    const idx = indexFromClientX(e.clientX);
    if (idx == null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    prevSelectedRef.current = selected;
    tapStartRef.current = { x: e.clientX, y: e.clientY };
    lastIndexRef.current = idx;
    setIsDragging(false);
    setSelected(idx);
  }

  function onPointerMove(e: React.PointerEvent<SVGRectElement>) {
    const captured = e.currentTarget.hasPointerCapture(e.pointerId);
    if (!captured) {
      // Not actively scrubbing — desktop hover preview.
      if (e.pointerType === 'mouse') setHovered(indexFromClientX(e.clientX));
      return;
    }
    // Promote to dragging once the finger moves past the 4px dead zone.
    const start = tapStartRef.current;
    if (start && !isDragging) {
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx > 4 || dy > 4) setIsDragging(true);
    }
    const idx = indexFromClientX(e.clientX);
    if (idx != null && idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      setSelected(idx);
      // Optional haptic — Chrome on Android honors this; iOS no-ops.
      navigator.vibrate?.(8);
    }
  }

  function onPointerUp(e: React.PointerEvent<SVGRectElement>) {
    const wasDrag = isDragging;
    const wasAlreadySelected = prevSelectedRef.current;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // Tap on already-pinned bar toggles it off. A drag that ends back at
    // the same bar does NOT toggle (the user was scrubbing, not tapping).
    if (!wasDrag) {
      const idx = indexFromClientX(e.clientX);
      if (idx != null && idx === wasAlreadySelected) setSelected(null);
    }
    setIsDragging(false);
    tapStartRef.current = null;
  }

  function onPointerLeave(e: React.PointerEvent<SVGRectElement>) {
    if (e.pointerType === 'mouse') setHovered(null);
  }

  function onPointerCancel(e: React.PointerEvent<SVGRectElement>) {
    // OS-level interrupts (incoming notification, palm rejection, etc.).
    // Clean up like pointerup but skip the toggle-off logic.
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
        // Look Up") on long-press during a scrub. touch-action: none only
        // handles scroll gestures; selection requires this WebKit set.
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      },
    },
  };
}
