import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ne from "./locales/ne.json";
import hi from "./locales/hi.json";

const savedLanguage =
    localStorage.getItem("bharatpur-language") || "en";

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: en,
            },
            ne: {
                translation: ne,
            },
            hi: {
                translation: hi,
            },
        },

        lng: savedLanguage,

        fallbackLng: "en",

        interpolation: {
            escapeValue: false,
        },
    });

i18n.on("languageChanged", (language) => {
    localStorage.setItem("bharatpur-language", language);
});

export default i18n;