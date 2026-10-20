export type Lang = 'az' | 'ru' | 'en';

export const LANGS: Lang[] = ['az', 'ru', 'en'];

export const LANG_LABELS: Record<Lang, string> = {
  az: 'AZ',
  ru: 'RU',
  en: 'EN',
};

export const DEFAULT_LANG: Lang = 'az';
