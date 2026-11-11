import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import {
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from "@angular/core";

import { LANGUAGE_TRANSLATIONS } from "./language.translations";
import type { LanguageCode } from "./language.types";

const STORAGE_KEY = "golf-note-language";
const DEFAULT_LANGUAGE: LanguageCode = "vi";

@Injectable({ providedIn: "root" })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _language = signal<LanguageCode>(this.readInitialLanguage());

  readonly language = this._language.asReadonly();
  readonly dictionary = computed(() => LANGUAGE_TRANSLATIONS[this._language()]);

  constructor() {
    this.updateDocumentLanguage(this._language());
  }

  setLanguage(language: LanguageCode): void {
    if (!LANGUAGE_TRANSLATIONS[language]) {
      return;
    }

    this._language.set(language);
    this.updateDocumentLanguage(language);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, language);
    }
  }

  toggleLanguage(): void {
    this.setLanguage(this._language() === "vi" ? "en" : "vi");
  }

  text(section: keyof typeof LANGUAGE_TRANSLATIONS.vi, key: string): string {
    const value = this.dictionary()[section] as Record<string, string>;
    return value[key] ?? key;
  }

  private readInitialLanguage(): LanguageCode {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "vi") {
        return stored;
      }
    }

    return DEFAULT_LANGUAGE;
  }

  private updateDocumentLanguage(language: LanguageCode): void {
    this.document.documentElement.lang = language;
  }
}
