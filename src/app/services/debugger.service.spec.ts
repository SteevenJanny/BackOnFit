import {TestBed} from '@angular/core/testing';
import {DebuggerModeService} from './debugger.service';
import SettingsService from './settings.service';
import {ToastController} from '@ionic/angular';
import {BehaviorSubject} from 'rxjs';

describe('DebuggerModeService', () => {

    let service: DebuggerModeService;

    // ---- Mocks ----
    let settingsMock: jasmine.SpyObj<SettingsService>;
    let toastControllerMock: any;
    let toastInstanceMock: any;

    // Settings change stream
    let settingsChanges$: BehaviorSubject<any>;

    beforeEach(() => {
        // mock settings service
        settingsChanges$ = new BehaviorSubject<any>({debugMode: false});

        settingsMock = jasmine.createSpyObj('SettingsService', [
            'getDebugMode'
        ], {
            // property `changes`
            changes: settingsChanges$.asObservable()
        });

        settingsMock.getDebugMode.and.returnValue(false);

        // mock toast instance
        toastInstanceMock = jasmine.createSpyObj('HTMLIonToastElement', ['present']);

        // mock toast controller
        toastControllerMock = jasmine.createSpyObj('ToastController', ['create']);
        toastControllerMock.create.and.resolveTo(toastInstanceMock);

        TestBed.configureTestingModule({
            providers: [
                DebuggerModeService,
                {provide: SettingsService, useValue: settingsMock},
                {provide: ToastController, useValue: toastControllerMock}
            ]
        });

        service = TestBed.inject(DebuggerModeService);
    });

    // ----------------------------
    //        TESTS
    // ----------------------------

    it('should be created', () => {
        service = TestBed.inject(DebuggerModeService);
        expect(service).toBeTruthy();
    });

    it('should load initial debug mode from settings', () => {
        service = TestBed.inject(DebuggerModeService);
        expect(settingsMock.getDebugMode).toHaveBeenCalled();
    });

    it('should update enabled state when settings change', () => {
        service = TestBed.inject(DebuggerModeService);
        expect(service.isEnabled()).toBeFalse();

        settingsChanges$.next({debugMode: true});
        expect(service.isEnabled()).toBeTrue();

        settingsChanges$.next({debugMode: false});
        expect(service.isEnabled()).toBeFalse();
    });

    it('notify() should do nothing when disabled', async () => {
        service = TestBed.inject(DebuggerModeService);
        settingsMock.getDebugMode.and.returnValue(false);

        await service.notify('hello');

        expect(toastControllerMock.create).not.toHaveBeenCalled();
        expect(toastInstanceMock.present).not.toHaveBeenCalled();
    });

    it('notify() should create and present a toast when enabled', async () => {
        // force enabled
        service = TestBed.inject(DebuggerModeService);
        settingsChanges$.next({debugMode: true});

        await service.notify('hello world');

        expect(toastControllerMock.create).toHaveBeenCalledWith({
            message: 'hello world',
            duration: 4000,
            color: 'warning',
            position: 'top'
        });

        expect(toastInstanceMock.present).toHaveBeenCalled();
    });

});
