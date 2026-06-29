import { useLanguage } from '../i18n/LanguageContext';
import { Languages } from 'lucide-react';

export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-natural-ivory border border-natural-sand rounded-full p-0.5">
      <Languages className="w-3.5 h-3.5 text-[#A3A199] ml-2 hidden sm:block" />
      {(['en', 'te'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            lang === code
              ? 'bg-white text-natural-heading shadow-sm'
              : 'text-[#A3A199] hover:text-natural-heading'
          }`}
          aria-label={t.lang.switch}
        >
          {t.lang[code]}
        </button>
      ))}
    </div>
  );
}
