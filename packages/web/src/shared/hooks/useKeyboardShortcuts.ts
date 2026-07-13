import { useEffect, useRef } from "react";

export interface KeyboardShortcut {
  /** Case-insensitive key, matched against `KeyboardEvent.key` (e.g. 'k', '/', 'Escape'). */
  key: string;
  /** Requires Cmd (mac) or Ctrl (other platforms). Also exempts the shortcut from the
   * typing-target guard below, since Cmd/Ctrl shortcuts are expected to work everywhere. */
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

/**
 * Registers global keyboard shortcuts. Plain-key shortcuts (no `meta`) are ignored while
 * the user is typing into an input/textarea/contenteditable element; `meta` shortcuts
 * always fire.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const typing = isTypingTarget(event.target);
      for (const shortcut of shortcutsRef.current) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const modifierPressed = event.metaKey || event.ctrlKey;
        const modifierMatches = shortcut.meta ? modifierPressed : !modifierPressed;
        if (!keyMatches || !modifierMatches) continue;
        if (typing && !shortcut.meta) continue;

        event.preventDefault();
        shortcut.handler(event);
        return;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
