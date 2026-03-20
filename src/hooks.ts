// Taken from https://github.com/Teppichseite/DeckPass/blob/main/src/hooks.ts

import { useCallback, useEffect, useState } from "react";

const jsContextState: Record<string, any> = {};

export const useJsContextState = <T>(key: string, initialValue: T): [T, (value: T) => Promise<void>] => {
  const [state, _setState] = useState<T>(initialValue);

  useEffect(() => {
    _setState(jsContextState[key] ?? initialValue);
  }, [key, initialValue]);

  const setState = useCallback(async (value: T) => {
    jsContextState[key] = value;
    _setState(value);
  }, [key]);

  return [state ?? initialValue, setState];
}