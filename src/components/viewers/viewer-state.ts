import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { PdfViewState, PersistedPdfViewState, TextViewState } from "../../interfaces";

const MAX_CACHE_SIZE = 100;

type CacheEntry = PersistedPdfViewState | TextViewState;

const viewerStateCache = new Map<string, CacheEntry>();

const DEFAULT_PDF_VIEW_STATE: PdfViewState = {
    pageNumber: 1,
    zoom: 1,
    totalPages: 1,
    position: { x: 0, y: 0 },
};

const DEFAULT_TEXT_VIEW_STATE: TextViewState = {
    fontSize: 12,
    scrollTop: 0,
};

function normalizePath(path: string): string {
    return path.replace(/\\/g, "");
}

function getCache(key: string): CacheEntry | undefined {
    const value = viewerStateCache.get(key);
    if (value === undefined) {
        return undefined;
    }
    viewerStateCache.delete(key);
    viewerStateCache.set(key, value);
    return value;
}

function setCache(key: string, value: CacheEntry): void {
    if (viewerStateCache.has(key)) {
        viewerStateCache.delete(key);
    }
    viewerStateCache.set(key, value);
    if (viewerStateCache.size > MAX_CACHE_SIZE) {
        const oldestKey = viewerStateCache.keys().next().value;
        if (oldestKey !== undefined) {
            viewerStateCache.delete(oldestKey);
        }
    }
}

function loadPdfViewState(cacheKey: string): PdfViewState {
    const cached = getCache(cacheKey) as PersistedPdfViewState | undefined;
    if (!cached) {
        return { ...DEFAULT_PDF_VIEW_STATE };
    }
    return {
        ...DEFAULT_PDF_VIEW_STATE,
        pageNumber: cached.pageNumber,
        zoom: cached.zoom,
        position: cached.position,
    };
}

function loadTextViewState(cacheKey: string): TextViewState {
    const cached = getCache(cacheKey) as TextViewState | undefined;
    return cached ?? { ...DEFAULT_TEXT_VIEW_STATE };
}

export function useCachedPdfViewState(pdfPath: string): [PdfViewState, Dispatch<SetStateAction<PdfViewState>>] {
    const cacheKey = `pdf:${normalizePath(pdfPath)}`;
    const cacheKeyRef = useRef(cacheKey);
    cacheKeyRef.current = cacheKey;

    const [viewState, setViewStateInternal] = useState<PdfViewState>(() => loadPdfViewState(cacheKey));

    useEffect(() => {
        setViewStateInternal(loadPdfViewState(cacheKey));
    }, [cacheKey]);

    const persist = useCallback((state: PdfViewState) => {
        setCache(cacheKeyRef.current, {
            pageNumber: state.pageNumber,
            zoom: state.zoom,
            position: state.position,
        });
    }, []);

    const setViewState = useCallback((value: SetStateAction<PdfViewState>) => {
        setViewStateInternal((prev) => {
            const next = typeof value === "function" ? value(prev) : value;
            persist(next);
            return next;
        });
    }, [persist]);

    return [viewState, setViewState];
}

export function useCachedTextViewState(txtPath: string): [
    number,
    (fontSize: number | ((prev: number) => number)) => void,
    number,
    (scrollTop: number | ((prev: number) => number)) => void,
] {
    const cacheKey = `txt:${normalizePath(txtPath)}`;
    const cacheKeyRef = useRef(cacheKey);
    cacheKeyRef.current = cacheKey;

    const [state, setStateInternal] = useState<TextViewState>(() => loadTextViewState(cacheKey));

    useEffect(() => {
        setStateInternal(loadTextViewState(cacheKey));
    }, [cacheKey]);

    const persist = useCallback((next: TextViewState) => {
        setCache(cacheKeyRef.current, next);
    }, []);

    const setFontSize = useCallback((value: number | ((prev: number) => number)) => {
        setStateInternal((prev) => {
            const fontSize = typeof value === "function" ? value(prev.fontSize) : value;
            const next = { ...prev, fontSize };
            persist(next);
            return next;
        });
    }, [persist]);

    const setScrollTop = useCallback((value: number | ((prev: number) => number)) => {
        setStateInternal((prev) => {
            const scrollTop = typeof value === "function" ? value(prev.scrollTop) : value;
            const next = { ...prev, scrollTop };
            persist(next);
            return next;
        });
    }, [persist]);

    return [state.fontSize, setFontSize, state.scrollTop, setScrollTop];
}
