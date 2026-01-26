// Taken from https://github.com/Teppichseite/DeckPass/blob/main/src/hooks.ts

import { useEffect, useState } from "react";

const jsContextState: Record<string, any> = {};

export const useJsContextState = <T>(key: string, initialValue: T): [T, (value: T) => Promise<void>] => {
  const [state, _setState] = useState<T>(initialValue);

  useEffect(() => {
    _setState(jsContextState[key] ?? initialValue);
  }, []);

  const setState = async (value: T) => {
    jsContextState[key] = value;
    _setState(value);
  };

  return [state ?? initialValue, setState];
}