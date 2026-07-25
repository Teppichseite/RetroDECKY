// Taken from https://github.com/Teppichseite/DeckPass/blob/main/src/hooks.ts
//
// Copyright (C) 2025 Teppichseite
// Licensed under the GNU General Public License v3.0 or (at your option) any later version.
//
// Modifications Copyright (C) 2025-2026 Teppichseite
// Licensed under the GNU General Public License v3.0 or (at your option) any later version.

import { useCallback, useEffect, useState, RefObject } from "react";

const jsContextState: Record<string, any> = {};

export const useJsContextState = <T>(
  key: string,
  initialValue: T
): [T, (value: T) => Promise<void>] => {
  const [state, _setState] = useState<T>(initialValue);

  useEffect(() => {
    _setState(jsContextState[key] ?? initialValue);
  }, [key, initialValue]);

  const setState = useCallback(
    async (value: T) => {
      jsContextState[key] = value;
      _setState(value);
    },
    [key]
  );

  return [state ?? initialValue, setState];
};

export const useDialogContentStyling = (
  contentRef: RefObject<HTMLDivElement | null>,
  width = "95vw"
) => {
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      if (parent.classList.contains("DialogContent")) {
        parent.style.width = width;
        parent.style.maxWidth = width;
        parent.style.padding = "12px";
        break;
      }
      parent = parent.parentElement;
    }
  }, [contentRef, width]);
};
