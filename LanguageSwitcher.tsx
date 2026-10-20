import { LANGS, LANG_LABELS, type Lang } from '@/lib/i18n/types';
import { useI18n } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={cn('inline-flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden text-xs font-semibold', className)}>
      {LANGS.map((l: Lang, i: number) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            'px-2 py-1 transition-colors',
            i > 0 && 'border-l border-gray-200',
            lang === l
              ? 'bg-primary-600 text-white'
              : 'text-gray-600 hover:bg-gray-50 hover:text-primary-700'
          )}
          aria-label={l === 'az' ? 'Azərbaycan' : l === 'ru' ? 'Русский' : 'English'}
          aria-pressed={lang === l}
        >
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
