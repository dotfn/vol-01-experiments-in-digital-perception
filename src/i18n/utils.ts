import { ui, defaultLang, showDefaultLang, type Lang } from './ui';

export function getLangFromUrl(url: URL): Lang {
  const [, segment] = url.pathname.split('/');
  if (segment in ui) return segment as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  const dict = ui[lang] as Record<string, string>;
  const defDict = ui[defaultLang] as Record<string, string>;
  return function t(key: string): string {
    return dict[key] ?? defDict[key] ?? key;
  };
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, l: Lang = lang): string {
    return !showDefaultLang && l === defaultLang ? path : `/${l}${path}`;
  };
}
