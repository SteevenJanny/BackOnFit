import {inject, Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import i18next from "i18next";
import {translationService} from "./translation/translation.service";
import {map, distinctUntilChanged} from 'rxjs/operators';
import {Preferences} from "@capacitor/preferences";

export type Theme = 'light' | 'dark' | 'system';

export interface SettingsModel {
  version: 1;
  language: string | undefined;
  theme: Theme;
  vibrateEffort: boolean;
  vibrateRest: boolean;
  soundEffort: boolean;
  soundRest: boolean;
  debugMode?: boolean;
}

@Injectable({providedIn: 'root'})
export class SettingsService {

  defaultSettings: SettingsModel = {
    version: 1,
    language: undefined,
    theme: 'system',
    vibrateEffort: true,
    vibrateRest: true,
    soundEffort: false,
    soundRest: false,
    debugMode: false,
  }

  private settings$ = new BehaviorSubject<SettingsModel>(this.defaultSettings);
  private userSettingsKey = 'userSettings';

  private i18nInitService = inject(translationService);

  constructor() {

  }

  async getSettings() {
    return await Preferences.get({key: this.userSettingsKey});
  }

  async setSettings(value: SettingsModel): Promise<void> {
    await Preferences.set({key: this.userSettingsKey, value: JSON.stringify(value)});
  }

  async init() {
    const stored = await this.getSettings();
    if (stored.value) {
      this.settings$.next(JSON.parse(stored.value));
    }

    await this.i18nInitService.init(this.getLanguage() || undefined);
    this.setTheme(this.getTheme());

    this.changes.pipe(
      map(s => s.language),
      distinctUntilChanged(),
    ).subscribe(language => {
      i18next.changeLanguage(language);
    })

    this.changes.pipe(
      map(s => s.theme),
      distinctUntilChanged(),
    ).subscribe(theme => {
        this.setTheme(theme);
      }
    )

  }

  setTheme(theme: Theme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = theme === "dark" || (theme === "system" && prefersDark);
    document.documentElement.classList.toggle('ion-palette-dark', useDark);
  }

  get value(): SettingsModel {
    return this.settings$.value;
  }

  get changes() {
    return this.settings$.asObservable();
  }

  async update(partial: Partial<SettingsModel>) {
    const updated = {...this.value, ...partial};
    this.settings$.next(updated);
    await this.setSettings(updated)
  }

  getLanguage(): string | undefined {
    return this.value.language;
  }

  getTheme(): Theme {
    return this.value.theme;
  }

  isVibrateEffortEnabled(): boolean {
    return this.value.vibrateEffort;
  }

  isVibrateRestEnabled(): boolean {
    return this.value.vibrateRest;
  }

  isSoundEffortEnabled(): boolean {
    return this.value.soundEffort;
  }

  isSoundRestEnabled(): boolean {
    return this.value.soundRest;
  }

  getDebugMode(): boolean {
    return this.value.debugMode || false;
  }
}

export default SettingsService
