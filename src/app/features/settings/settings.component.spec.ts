import {ComponentFixture, TestBed} from '@angular/core/testing';
import {SettingsComponent} from './settings.component';
import {SettingsService} from '../../services/settings.service';
import {DebuggerModeService} from '../../services/debugger.service';
import {ModalController} from '@ionic/angular';
import {TranslatePipe, translationService} from '../../services/translation/translation.service';
import {Capacitor} from '@capacitor/core';

describe('SettingsComponent', () => {
    let component: SettingsComponent;
    let fixture: ComponentFixture<SettingsComponent>;

    let settingsMock: jasmine.SpyObj<SettingsService>;
    let debuggerMock: jasmine.SpyObj<DebuggerModeService>;
    let modalMock: jasmine.SpyObj<ModalController>;
    let translationMock: jasmine.SpyObj<translationService>;

    beforeEach(async () => {
        // --- MOCK CAPACITOR ---
        spyOn(Capacitor, 'getPlatform').and.returnValue('android');

        // --- MOCK SERVICES ---
        settingsMock = jasmine.createSpyObj('SettingsService', [
            'getLanguage',
            'update',
            'getTheme',
            'isVibrateEffortEnabled',
            'isVibrateRestEnabled',
            'isSoundEffortEnabled',
            'isSoundRestEnabled',
            'getDebugMode'
        ]);

        settingsMock.update.and.resolveTo(undefined);
        settingsMock.getLanguage.and.returnValue('en');

        debuggerMock = jasmine.createSpyObj('DebuggerModeService', ['notify']);
        modalMock = jasmine.createSpyObj('ModalController', ['dismiss']);

        translationMock = jasmine.createSpyObj('translationService', ['getSupportedLanguages']);
        translationMock.getSupportedLanguages.and.returnValue(['en', 'fr', 'de']);

        await TestBed.configureTestingModule({
            imports: [SettingsComponent],
            providers: [
                {provide: SettingsService, useValue: settingsMock},
                {provide: DebuggerModeService, useValue: debuggerMock},
                {provide: ModalController, useValue: modalMock},
                {provide: translationService, useValue: translationMock},
                TranslatePipe
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SettingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // -----------------------------------------------------
    // CONSTRUCTOR — unsupported languages filtered
    // -----------------------------------------------------
    it('should remove unsupported languages and notify debugger', () => {
        settingsMock.getLanguage.and.returnValue('es');

        // we must force call to constructor logic manually:
        const comp2 = TestBed.createComponent(SettingsComponent).componentInstance;

        expect(debuggerMock.notify).toHaveBeenCalledWith('Language es is not supported!');
    });

    // -----------------------------------------------------
    // changeLanguage
    // -----------------------------------------------------
    it('should toggle selected class correctly when changeLanguage is called', () => {
        // Fake DOM buttons
        const btn1 = document.createElement('button');
        btn1.classList.add('lang-btn');
        btn1.setAttribute('lang', 'en');

        const btn2 = document.createElement('button');
        btn2.classList.add('lang-btn');
        btn2.setAttribute('lang', 'fr');

        spyOn(document, 'getElementsByClassName').and.returnValue([btn1, btn2] as any);

        const spy = spyOn(component, 'setSettings');

        component.changeLanguage('fr');

        expect(btn1.classList.contains('selected')).toBeFalse();
        expect(btn2.classList.contains('selected')).toBeTrue();
        expect(spy).toHaveBeenCalledWith('fr', 'language');
    });

    // -----------------------------------------------------
    // close()
    // -----------------------------------------------------
    it('should call modal.dismiss()', () => {
        component.close();
        expect(modalMock.dismiss).toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // setSettings()
    // -----------------------------------------------------
    it('should update settings through service', async () => {
        await component.setSettings('dark', 'theme');
        expect(settingsMock.update).toHaveBeenCalledWith({theme: 'dark'});
    });

    // -----------------------------------------------------
    // GETTERS
    // -----------------------------------------------------
    it('should expose settings flags correctly', () => {
        settingsMock.getTheme.and.returnValue('dark');
        settingsMock.isVibrateEffortEnabled.and.returnValue(true);
        settingsMock.isVibrateRestEnabled.and.returnValue(false);
        settingsMock.isSoundEffortEnabled.and.returnValue(true);
        settingsMock.isSoundRestEnabled.and.returnValue(false);
        settingsMock.getDebugMode.and.returnValue(true);

        expect(component.isDarkModeEnabled).toBeTrue();
        expect(component.isVibrateEffortEnabled).toBeTrue();
        expect(component.isVibrateRestEnabled).toBeFalse();
        expect(component.isSoundEffortEnabled).toBeTrue();
        expect(component.isSoundRestEnabled).toBeFalse();
        expect(component.isDebugModeEnabled).toBeTrue();
    });
});
