import {Injectable, Pipe, PipeTransform} from '@angular/core';
import i18next from 'i18next';
import HttpBackend from 'i18next-http-backend';

/**
 * Initializes i18next with the given language.
 * Returns a promise that resolves to the i18next instance.
 */

const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'it', 'de'];

@Injectable({providedIn: 'root'})
export class translationService {

    constructor() {

    }

    async init(language?: string): Promise<void> {
        await initI18n(language);
    }

    getSupportedLanguages(): string[] {
        return SUPPORTED_LANGUAGES;
    }

    t(key: string, params?: any): string {
        let out = i18next.t(key) || key;
        if (params) {
            for (const key of Object.keys(params)) {
                out = out.replace(`{{${key}}}`, params[key]);
            }
        }
        return out;
    }

    getLocale() {
        const lang =
            (i18next && i18next.language) ||
            (typeof navigator !== 'undefined' && navigator.language) ||
            'en';
        return lang.split('-')[0];
    }
}

async function initI18n(language?: string): Promise<void> {
    try {
        await i18next
            .use(HttpBackend)
            .init({
                lng: language,
                fallbackLng: 'en',
                backend: {
                    loadPath: 'assets/locales/{{lng}}.json'
                },
                interpolation: {
                    escapeValue: false
                },
                supportedLngs: SUPPORTED_LANGUAGES,
                debug: false,
            });
    } catch (error) {
        // Fallback to default language if initialization fails
        console.error('i18n initialization failed:', error);
        await i18next.init({lng: 'en', fallbackLng: 'en'});

    }
}

/**
 * Angular pipe for translations.
 */

@Injectable({providedIn: 'root'})
@Pipe({
    name: 't',
    standalone: true,
    pure: false
})
export class TranslatePipe implements PipeTransform {
    transform(key: string): string {
        if (!key) return '';
        try {
            return i18next.t(key) || key;
        } catch {
            return key;
        }
    }
}
