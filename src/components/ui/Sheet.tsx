"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

/**
 * Sheet — the app's one overlay primitive.
 *
 * On phones (< sm) it's a bottom-sheet that slides up and sits flush against
 * the bottom edge; on tablets/desktop (>= sm) it's the familiar centered
 * dialog. That's done with pure Tailwind responsive classes (the app has no
 * useMediaQuery), so it works in the static export with no JS branching.
 *
 * It owns the tedious, easy-to-get-wrong overlay behavior so the modals don't
 * each re-implement it: backdrop + Escape to close, body-scroll lock, and a
 * focus trap that restores focus to whatever opened it. The focus logic is
 * lifted from SettingsModal (the only modal that had a complete version).
 *
 * Callers pass their existing header/body/footer as children — Sheet only
 * provides the responsive shell, the mobile drag-handle, and the behavior.
 */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** id of the element (usually the caller's <h2>) that names the dialog. */
  labelledById?: string;
  /** Accessible name when there's no visible title to point at. */
  ariaLabel?: string;
  /** Desktop max width. Mobile is always full-width. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Element to focus on open; defaults to the first focusable in the panel. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Extra classes for the panel. */
  className?: string;
  children: React.ReactNode;
}

const SIZE_CLASS: Record<NonNullable<SheetProps["size"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

// Same focusable set SettingsModal used for its trap.
const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  labelledById,
  ariaLabel,
  size = "md",
  initialFocusRef,
  className,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Lock background scroll while open so the page behind doesn't move.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Move focus into the panel on open; return it to the trigger when the sheet
  // goes away. The restore lives in the cleanup so it fires for BOTH mounting
  // styles: modals that toggle an `open` prop (Settings, Shortcuts) and modals
  // that the parent mounts/unmounts (PromptForm, PromptDetail).
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const target =
      initialFocusRef?.current ??
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
      null;
    // rAF so the panel is painted before we focus (avoids a missed focus).
    requestAnimationFrame(() => target?.focus());
    return () => {
      // Only restore if the opener is still in the DOM (it may have unmounted).
      const t = triggerRef.current;
      if (t instanceof HTMLElement && document.body.contains(t)) t.focus();
    };
  }, [open, initialFocusRef]);

  // Escape closes; Tab/Shift+Tab cycle within the panel.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          el.getClientRects().length > 0 &&
          !el.closest('[aria-hidden="true"]'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        aria-label={labelledById ? undefined : ariaLabel}
        className={clsx(
          "relative flex w-full flex-col overflow-hidden bg-surface shadow-palette",
          // Mobile: full-width bottom-sheet, rounded top only, flush to bottom edge.
          "max-h-[92vh] rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)]",
          // Desktop: centered dialog with a max width + full border/rounding.
          "sm:max-h-[85vh] sm:rounded-xl sm:border",
          "dark:border-night-border dark:bg-night-surface",
          "animate-slide-up sm:animate-scale-in",
          SIZE_CLASS[size],
          className,
        )}
      >
        {/* Grab-handle affordance — visual only, mobile bottom-sheet. */}
        <div
          aria-hidden
          className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border dark:bg-night-border sm:hidden"
        />
        {children}
      </div>
    </div>
  );
}
