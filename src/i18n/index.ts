import en from './locales/en';
import it from './locales/it';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';
import pt from './locales/pt';
import ru from './locales/ru';
import ja from './locales/ja';
import zh from './locales/zh';
import ko from './locales/ko';
import ar from './locales/ar';
import hi from './locales/hi';
import tr from './locales/tr';
import pl from './locales/pl';
import nl from './locales/nl';
import type { TranslationKey } from './locales/en';
import { useAppStore } from '../store/useAppStore';

export type { TranslationKey };

export type SupportedLocale = 
  | 'en' | 'it' | 'es' | 'fr' | 'de' | 'pt' 
  | 'ru' | 'ja' | 'zh' | 'ko' | 'ar' | 'hi' 
  | 'tr' | 'pl' | 'nl';

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: '🇬🇧 English',
  it: '🇮🇹 Italiano',
  es: '🇪🇸 Español',
  fr: '🇫🇷 Français',
  de: '🇩🇪 Deutsch',
  pt: '🇵🇹 Português',
  ru: '🇷🇺 Русский',
  ja: '🇯🇵 日本語',
  zh: '🇨🇳 中文',
  ko: '🇰🇷 한국어',
  ar: '🇸🇦 العربية',
  hi: '🇮🇳 हिन्दी',
  tr: '🇹🇷 Türkçe',
  pl: '🇵🇱 Polski',
  nl: '🇳🇱 Nederlands',
};

const locales: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en, it, es, fr, de, pt, ru, ja, zh, ko, ar, hi, tr, pl, nl,
};

export const SUPPORTED_LOCALES = Object.keys(locales) as SupportedLocale[];

/**
 * Detect user's preferred language from browser settings.
 * Returns a supported locale or 'en' as fallback.
 */
export function detectLocale(): SupportedLocale {
  const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
  if (browserLang && browserLang in locales) return browserLang as SupportedLocale;
  return 'en';
}

/**
 * Lightweight translation hook. Returns a `t()` function
 * that fetches string for current language with English fallback.
 */
export function useTranslation() {
  const language = useAppStore((s) => s.language) as SupportedLocale;
  const dict = locales[language] ?? locales.en;

  function t(key: TranslationKey | string): string {
    const k = key as TranslationKey;
    return dict[k] ?? locales.en[k] ?? key;
  }

  return { t, language };
}
