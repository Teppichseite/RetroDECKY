import { createElement, Fragment, type ReactNode } from "react";
import en from "./locales/en";
import fr from "./locales/fr";
import { Action } from "../interfaces";

// Minimal i18n without extra dependency.
// English is the reference: any key missing from another locale falls back to it.
export type TranslationKey = keyof typeof en;
export type Translations = Partial<Record<TranslationKey, string>>;

const locales: Record<string, Translations> = { en, fr };

// Steam may report its UI language either as a name ("french") or as a code ("fr-FR").
const STEAM_LANGUAGE_NAMES: Record<string, string> = {
  english: "en",
  french: "fr",
};

function normalize(lang?: string): string | undefined {
  if (!lang) return undefined;
  const lower = lang.toLowerCase();
  return STEAM_LANGUAGE_NAMES[lower] ?? lower.split(/[-_]/)[0];
}

let cachedLanguage: string | undefined;

/**
 * Language of the Steam UI: Steam's own localization manager first,
 * then the CEF browser language (which follows the Steam language).
 */
export function getLanguage(): string {
  if (!cachedLanguage) {
    const detected =
      normalize(window.LocalizationManager?.m_rgLocalesToUse?.[0]) ??
      normalize(navigator.language);
    cachedLanguage = detected && detected in locales ? detected : "en";
  }
  return cachedLanguage;
}

// French typography: non-breaking space before ? ! : ; % » and after «.
// Applied to the translated template only, never to the inserted values.
function applyTypography(text: string, lang: string): string {
  if (lang !== "fr") return text;
  return text.replace(/ ([?!:;%»])/g, " $1").replace(/« /g, "« ");
}

function getTemplate(key: TranslationKey): string {
  const lang = getLanguage();
  return applyTypography(locales[lang]?.[key] ?? en[key], lang);
}

/**
 * Translates a key, replacing {{name}} placeholders with the given values.
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return getTemplate(key).replace(/{{(\w+)}}/g, (match, name) =>
    params && name in params ? String(params[name]) : match
  );
}

/**
 * Same as t(), but placeholders can be React nodes (e.g. <strong>).
 */
export function tx(key: TranslationKey, params: Record<string, ReactNode>): ReactNode {
  const parts = getTemplate(key)
    .split(/({{\w+}})/g)
    .filter((part) => part !== "")
    .map((part) => {
      const name = part.match(/^{{(\w+)}}$/)?.[1];
      return name && name in params ? params[name] : part;
    });
  return createElement(Fragment, null, ...parts);
}

/**
 * Translation of a key built at runtime from data (action ids, categories...),
 * or the given fallback (the original data) when the current locale has none.
 */
function tData(key: string, fallback: string): string {
  const lang = getLanguage();
  const template = locales[lang]?.[key as TranslationKey];
  return template ? applyTypography(template, lang) : fallback;
}

/**
 * Display name of an action from actions.json.
 * Ids are generated from names and lose symbols ("Sunlight +" and "Sunlight -" are both
 * "melonds-sunlight"), so a trailing + or - is kept in the key.
 */
export function actionName(action: Action): string {
  const sign = action.name.match(/[+-]$/)?.[0] ?? "";
  return tData(`actions.${action.id}${sign}`, action.name);
}

export function categoryName(category: string): string {
  return tData(`actionCategories.${category}`, category);
}

export function hotkeyLabelName(name: string): string {
  return tData(`hotkeyLabels.${name}`, name);
}

export function hotkeyKeyName(key: string): string {
  return tData(`hotkeyKeys.${key}`, key);
}
