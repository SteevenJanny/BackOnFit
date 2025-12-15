import {SettingsService, SettingsModel} from './settings.service';

import i18next from 'i18next';
import {translationService} from './translation/translation.service';
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {_mockStore} from '__mocks__/@capacitor/preferences';

describe('SettingsService', () => {

    let service: SettingsService;

    // --- Mocks -------------------------------------------------
    let changeLanguageSpy: jasmine.Spy;
    let matchMediaSpy: jasmine.Spy;
    let classToggleSpy: jasmine.Spy;
    let i18nSpy: jasmine.SpyObj<translationService>;

    const dummySettings: SettingsModel = {
        version: 1,
        language: 'fr',
        theme: 'dark',
        vibrateEffort: false,
        vibrateRest: true,
        soundEffort: false,
        soundRest: true,
        debugMode: true,
    }

    beforeEach(() => {
        i18nSpy = jasmine.createSpyObj<translationService>('I18nInitService', ['init']);
        changeLanguageSpy = spyOn(i18next, 'changeLanguage').and.stub();
        matchMediaSpy = spyOn(window, 'matchMedia').and.callFake((query: string) => {
            return {
                matches: false,        // default: system is light mode
                media: query,
                onchange: null,
                addEventListener() {
                },
                removeEventListener() {
                },
                addListener() {
                },
                removeListener() {
                },
                dispatchEvent() {
                    return false;
                }
            } as any;
        });

        // Mock class toggle
        classToggleSpy = spyOn(document.documentElement.classList, 'toggle');
        _mockStore['userSettings'] = undefined;

        TestBed.configureTestingModule({
            providers: [
                SettingsService,
                {provide: translationService, useValue: i18nSpy},
            ]
        });
        i18nSpy.init.and.resolveTo();

    });

    describe('Preferences R/W', () => {
        it('should retrieve settings from storage', fakeAsync(async () => {
            service = TestBed.inject(SettingsService);
            _mockStore['userSettings'] = JSON.stringify(dummySettings);
            const result = await service.getSettings();
            tick();
            expect(result.value).toBe(_mockStore['userSettings']);
        }));

        it('should store settings to storage', fakeAsync(async () => {
            service = TestBed.inject(SettingsService);
            await service.setSettings(dummySettings);
            tick();
            expect(_mockStore['userSettings']).toBe(JSON.stringify(dummySettings));
        }));
    })

    describe("Initialization Logic", () => {
        it('should initialize with default settings when no stored settings exist', fakeAsync(async () => {
                // No stored settings returned
                service = TestBed.inject(SettingsService);
                await service.init();
                tick();
                const defaultSettings = service.defaultSettings;
                defaultSettings.language = "en";

                expect(service.value).toEqual(defaultSettings);
                expect(i18nSpy.init).toHaveBeenCalledWith(defaultSettings.language);
                expect(classToggleSpy).toHaveBeenCalled();  // theme applied
            }
        ));

        it('should subscribe to language and theme changes', fakeAsync(async () => {
                service = TestBed.inject(SettingsService);
                await service.init();
                tick();
                changeLanguageSpy.calls.reset();
                classToggleSpy.calls.reset();
                // Update language
                await service.update({language: 'es'});
                tick();
                expect(changeLanguageSpy).toHaveBeenCalledWith('es');

                // Update theme
                await service.update({theme: 'light'});
                tick();
                expect(classToggleSpy).toHaveBeenCalled();
            }
        ));

        it('should load stored settings and apply them', fakeAsync(async () => {
            service = TestBed.inject(SettingsService);
            _mockStore['userSettings'] = JSON.stringify(dummySettings);
            // Pretend system theme = light
            matchMediaSpy.and.returnValue({matches: false} as any);

            await service.init();
            tick();

            expect(service.value).toEqual(dummySettings);
        }));
    })

    // --------------------------------------------------------------------
    // UPDATE LOGIC
    // --------------------------------------------------------------------
    it('should update settings and persist them', fakeAsync(async () => {
        service = TestBed.inject(SettingsService);
        await service.update({soundEffort: true});
        tick();

        expect(service.value.soundEffort).toBeTrue();

    }));

    // --------------------------------------------------------------------
    // LANGUAGE CHANGE REACTIVITY
    // --------------------------------------------------------------------
    it('should reactively change language through i18next', fakeAsync(async () => {
        service = TestBed.inject(SettingsService);
        await service.init();
        tick();
        changeLanguageSpy.calls.reset();

        await service.update({language: 'de'});
        tick();

        expect(changeLanguageSpy).toHaveBeenCalledWith('de');
    }));

    // --------------------------------------------------------------------
    // THEME LOGIC
    // --------------------------------------------------------------------
    it('should apply dark theme when theme="dark"', () => {
        matchMediaSpy.and.returnValue({matches: false} as any);
        service = TestBed.inject(SettingsService);
        service.setTheme('dark');

        expect(classToggleSpy).toHaveBeenCalledWith('ion-palette-dark', true);
    });

    it('should apply light theme when theme="light"', () => {
        matchMediaSpy.and.returnValue({matches: true} as any);
        service = TestBed.inject(SettingsService);
        service.setTheme('light');

        expect(classToggleSpy).toHaveBeenCalledWith('ion-palette-dark', false);
    });

    // --------------------------------------------------------------------
    // GETTERS
    // --------------------------------------------------------------------
    it('should expose getter values', () => {
        service = TestBed.inject(SettingsService);
        service['settings$'].next({
            version: 1,
            language: 'es',
            theme: 'light',
            vibrateEffort: false,
            vibrateRest: true,
            soundEffort: true,
            soundRest: false,
            debugMode: true,
        });

        expect(service.getLanguage()).toBe('es');
        expect(service.getTheme()).toBe('light');
        expect(service.isVibrateEffortEnabled()).toBeFalse();
        expect(service.isVibrateRestEnabled()).toBeTrue();
        expect(service.isSoundEffortEnabled()).toBeTrue();
        expect(service.isSoundRestEnabled()).toBeFalse();
        expect(service.getDebugMode()).toBeTrue();
    });
})
;
