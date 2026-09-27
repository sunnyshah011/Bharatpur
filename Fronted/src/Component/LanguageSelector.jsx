import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const LanguageSelector = () => {
    const { i18n, t } = useTranslation();

    const changeLanguage = (language) => {
        i18n.changeLanguage(language);
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <Globe size={18} className="text-slate-500" />

                <select
                    value={i18n.language}
                    onChange={(e) => changeLanguage(e.target.value)}
                    className="
            cursor-pointer rounded-xl border border-slate-200
            bg-white px-3 py-2 text-sm font-semibold
            text-slate-700 outline-none
            transition
            hover:border-emerald-300
            focus:border-emerald-500
            focus:ring-2 focus:ring-emerald-100
          "
                    aria-label={t("common.language")}
                >
                    <option value="en">English</option>
                    <option value="ne">नेपाली</option>
                    <option value="hi">हिन्दी</option>
                </select>
            </div>
        </div>
    );
};

export default LanguageSelector;