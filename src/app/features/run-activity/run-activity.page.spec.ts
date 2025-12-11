import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {RunActivityPage} from './run-activity.page';
import {ActivatedRoute, Router} from '@angular/router';
import {DebuggerModeService} from '../../services/debugger.service';
import SettingsService from '../../services/settings.service';
import {Subject} from 'rxjs';
import {NativeAudio} from '@capacitor-community/native-audio';
import {Haptics} from '@capacitor/haptics';
import {KeepAwake} from "@capacitor-community/keep-awake";

describe('RunActivityPage', () => {
    let component: RunActivityPage;
    let routeSubject: Subject<any>;
    let routerMock: any;
    let debugMock: any;
    let settingsMock: any;

    // Mocks for NativeAudio, Haptics, KeepAwake
    // beforeAll(() => {
    //     // ensure these exist on global so spyOn works reliably
    //     if (!(NativeAudio as any)) (global as any).NativeAudio = {};
    //     if (!(Haptics as any)) (global as any).Haptics = {};
    //     if (!(KeepAwake as any)) (global as any).KeepAwake = {};
    // });

    beforeEach(async () => {
        // Prepare route observable so tests can emit params
        routeSubject = new Subject<any>();

        routerMock = {
            navigate: jasmine.createSpy('navigate')
        };

        debugMock = jasmine.createSpyObj('DebuggerModeService', ['notify']);

        settingsMock = jasmine.createSpyObj('SettingsService', [
            'isSoundEffortEnabled',
            'isVibrateEffortEnabled',
            'isSoundRestEnabled',
            'isVibrateRestEnabled'
        ]);

        // default settings values (can be changed in tests)
        settingsMock.isSoundEffortEnabled.and.returnValue(true);
        settingsMock.isVibrateEffortEnabled.and.returnValue(true);
        settingsMock.isSoundRestEnabled.and.returnValue(true);
        settingsMock.isVibrateRestEnabled.and.returnValue(true);

        // NativeAudio mock
        spyOn(NativeAudio, 'preload').and.callFake(() => Promise.resolve());
        spyOn(NativeAudio, 'play').and.callFake(() => Promise.resolve());

        // Haptics mock
        spyOn(Haptics, 'vibrate').and.callFake(() => Promise.resolve());
        spyOn(KeepAwake, "allowSleep").and.callFake(() => Promise.resolve());
        await TestBed.configureTestingModule({
            imports: [RunActivityPage],
            providers: [
                {provide: ActivatedRoute, useValue: {queryParams: routeSubject.asObservable()}},
                {provide: Router, useValue: routerMock},
                {provide: DebuggerModeService, useValue: debugMock},
                {provide: SettingsService, useValue: settingsMock},
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(RunActivityPage);
        component = fixture.componentInstance;

    });

    // ------------------------------
    // preloadSounds error handling
    // ------------------------------
    it('preloadSounds should notify debugger on preload failure', fakeAsync(async () => {
        // call preloadSounds explicitly (constructor already called once in component creation)
        (NativeAudio.preload as jasmine.Spy).and.callFake(() => Promise.reject('preload error'));
        await component.preloadSounds();
        expect(debugMock.notify).toHaveBeenCalled();
    }));

    // ------------------------------
    // bootstrapFromParams - direct activity param
    // ------------------------------
    it('bootstrapFromParams should load activity when "activity" param is valid JSON', fakeAsync(async () => {
        const activity = {id: 'a1', type: 'time', config: {effortTime: 5, restTime: 2, iterations: 1}};
        const params = {activity: JSON.stringify(activity)};
        // emit params as if route provided them
        component.ngOnInit();
        routeSubject.next(params);
        tick(); // allow subscription to run

        // after ngOnInit subscription, component should have started ready phase
        expect(component.currentActivity).toBeDefined();
        expect(component.session).toBeUndefined();
        expect(component.phase).toBe('ready');
    }));

    it('bootstrapFromParams should notify on invalid activity JSON', fakeAsync(async () => {
        const params = {activity: 'not-json'};
        component.ngOnInit();
        routeSubject.next(params);
        tick();
        // invalid json => debugger.notify called
        expect(debugMock.notify).toHaveBeenCalled();
    }));

    // ------------------------------
    // bootstrapFromParams - session param handling
    // ------------------------------
    it('bootstrapFromParams should parse session and set currentActivity based on id', fakeAsync(async () => {
        const session = {
            id: 's1',
            activities: [
                {id: 'a1', type: 'time', config: {effortTime: 1, restTime: 0, iterations: 2}},
                {id: 'a2', type: 'count', config: {iterations: 1, restTime: 0}}
            ]
        } as any;
        const params = {session: JSON.stringify(session), currentActivityId: '1'};
        component.ngOnInit();
        routeSubject.next(params);
        tick();

        expect(component.session).toBeDefined();
        expect(component.currentActivityId).toBe(1);
        expect(component.currentActivity.id).toBe('a2');
    }));

    it('bootstrapFromParams should notify on missing currentActivityId', fakeAsync(async () => {
        const session = {id: 's1', activities: []} as any;
        const params = {session: JSON.stringify(session)}; // no currentActivityId
        component.ngOnInit();
        routeSubject.next(params);
        tick();

        expect(debugMock.notify).toHaveBeenCalled();
    }));

    it('bootstrapFromParams should notify on out-of-bounds currentActivityId', fakeAsync(async () => {
        const session = {id: 's1', activities: [{id: 'a1'}]} as any;
        const params = {session: JSON.stringify(session), currentActivityId: '5'};
        component.ngOnInit();
        routeSubject.next(params);
        tick();

        expect(debugMock.notify).toHaveBeenCalled();
    }));

    // ------------------------------
    // startReadyPhase / isReadyPhaseDone -> startEffortPhase
    // ------------------------------
    it('startReadyPhase sets phase ready and sets callback; isReadyPhaseDone starts effort', fakeAsync(() => {
        // prepare a simple activity
        component.currentActivity = {id: 'a', type: 'time', config: {effortTime: 1, restTime: 0, iterations: 1}} as any;
        component.isRunning = true; // emulate started run so runTimer will be called
        component.startReadyPhase();

        expect(component.phase).toBe('ready');
        expect(typeof component._callback).toBe('function');
        // simulate ready done
        (component._callback as Function)();
        tick();

        expect(component.phase).toBe('effort');
    }));

    // ------------------------------
    // runTimer / skipPhase
    // ------------------------------
    it('runTimer should decrement timeLeft and call callback when time is over', fakeAsync(() => {
        component.timeLeft = 0.02; // small time so timer triggers quickly
        component._callback = jasmine.createSpy('cb');
        component.isRunning = true;
        component.runTimer();

        // run a few ticks to trigger interval; interval period is 10ms -> tick 20ms
        tick(30);
        expect((component._callback as jasmine.Spy).calls.count()).toBeGreaterThan(0);
        component.clearTimer();
    }));

    it('skipPhase should clear timer and call callback immediately', fakeAsync(() => {
        component._callback = jasmine.createSpy('cb2');
        // ensure interval is set to something
        component.interval = setInterval(() => {
        }, 1000);
        spyOn(component, 'clearTimer').and.callThrough();

        component.skipPhase();
        tick();
        expect(component.clearTimer).toHaveBeenCalled();
        expect((component._callback as jasmine.Spy).calls.count()).toBe(1);
    }));

    // ------------------------------
    // startEffortPhase non-time based (count) should set isRunning true
    // ------------------------------
    it('startEffortPhase for non-time activity sets isRunning=true and vibrates', fakeAsync(async () => {
        component.currentActivity = {id: 'a', type: 'count', config: {iterations: 3, restTime: 1}} as any;
        component.isRunning = false;
        spyOn(component, 'vibrateEffort').and.callFake(() => Promise.resolve());
        component.startEffortPhase();
        tick();
        expect(component.phase).toBe('effort');
        expect(component.isRunning).toBeTrue();
        expect(component.vibrateEffort).toHaveBeenCalled();
    }));

    // ------------------------------
    // isEffortPhaseDone leading to sendToCompleted when last iteration
    // ------------------------------
    it('isEffortPhaseDone should sendToCompleted when last iteration', fakeAsync(() => {
        component.currentActivity = {id: 'a', type: 'time', config: {iterations: 1, effortTime: 1, restTime: 0}} as any;
        component.currentIteration = 1; // last iteration
        spyOn(component, 'sendToCompleted').and.callFake(() => {
        });
        component.isEffortPhaseDone();
        tick();
        expect(component.sendToCompleted).toHaveBeenCalled();
    }));

    // ------------------------------
    // isEffortPhaseDone should start rest or step accordingly
    // ------------------------------
    it('isEffortPhaseDone should startRestPhase if restTime > 0', fakeAsync(() => {
        component.currentActivity = {id: 'a', type: 'time', config: {iterations: 3, effortTime: 1, restTime: 2}} as any;
        component.currentIteration = 1;
        spyOn(component, 'startRestPhase').and.callFake(() => {
        });
        component.isEffortPhaseDone();
        tick();
        expect(component.startRestPhase).toHaveBeenCalled();
    }));

    it('isEffortPhaseDone should call step if restTime == 0', fakeAsync(() => {
        component.currentActivity = {id: 'a', type: 'time', config: {iterations: 3, effortTime: 1, restTime: 0}} as any;
        component.currentIteration = 1;
        spyOn(component, 'step').and.callFake(() => {
        });
        component.isEffortPhaseDone();
        tick();
        expect(component.step).toHaveBeenCalled();
    }));

    // ------------------------------
    // startRestPhase behavior
    // ------------------------------
    it('startRestPhase sets phase to rest and triggers vibrate when running', fakeAsync(async () => {
        component.currentActivity = {id: 'a', type: 'time', config: {restTime: 2, iterations: 2}} as any;
        component.isRunning = true;
        spyOn(component, 'vibrateRest').and.callFake(() => Promise.resolve());
        component.startRestPhase();
        tick();
        expect(component.phase).toBe('rest');
        expect(component.vibrateRest).toHaveBeenCalled();
    }));

    // ------------------------------
    // sendToCompleted navigates to /completed
    // ------------------------------
    it('sendToCompleted should navigate to /completed with query params', fakeAsync(() => {
        component.session = {id: 's1'} as any;
        component.currentActivity = {id: 'a1'} as any;
        component.currentActivityId = 2;
        spyOn(component, 'vibrateDone').and.callFake(() => Promise.resolve());

        component.sendToCompleted();
        tick();

        expect(routerMock.navigate).toHaveBeenCalledWith(['/completed'], jasmine.objectContaining({
            queryParams: jasmine.any(Object)
        }));
    }));

    // ------------------------------
    // startOrPause toggling
    // ------------------------------
    it('startOrPause should start when stopped and pause when running', fakeAsync(() => {
        component.phase = 'effort';
        component.isRunning = false;
        spyOn(component, 'runTimer').and.callFake(() => {
        });
        spyOn(component, 'vibrateEffort').and.callFake(() => Promise.resolve());

        component.startOrPause();
        tick();
        expect(component.isRunning).toBeTrue();
        expect(component.runTimer).toHaveBeenCalled();

        // now pause
        component.startOrPause();
        tick();
        expect(component.isRunning).toBeFalse();
    }));

    // ------------------------------
    // vibrateEffort: no-op when phase is ready
    // ------------------------------
    it('vibrateEffort should return immediately if in ready phase', fakeAsync(async () => {
        component.phase = 'ready';
        await component.vibrateEffort();
        expect(NativeAudio.play).not.toHaveBeenCalled();
        expect(Haptics.vibrate).not.toHaveBeenCalled();
    }));

    it('vibrateEffort should play sound and vibrate when enabled', fakeAsync(async () => {
        component.phase = 'effort';
        settingsMock.isSoundEffortEnabled.and.returnValue(true);
        settingsMock.isVibrateEffortEnabled.and.returnValue(true);

        await component.vibrateEffort();
        expect(NativeAudio.play).toHaveBeenCalled();
        expect(Haptics.vibrate).toHaveBeenCalled();
    }));

    // ------------------------------
    // vibrateDone triggers finishedSound + three vibrations spaced
    // ------------------------------
    it('vibrateDone plays finishedSound and vibrates three times', fakeAsync(() => {
        settingsMock.isSoundRestEnabled.and.returnValue(true);
        settingsMock.isVibrateRestEnabled.and.returnValue(true);
        (NativeAudio.play as jasmine.Spy).and.returnValue(Promise.resolve());
        (Haptics.vibrate as jasmine.Spy).and.returnValue(Promise.resolve());

        component.vibrateDone();
        // initial call triggers immediate vibrate + setTimeout calls at 250ms and 500ms
        tick(); // allow initial synchronous code
        expect(NativeAudio.play).toHaveBeenCalled();
        expect(Haptics.vibrate).toHaveBeenCalledTimes(1);

        tick(250);
        expect(Haptics.vibrate).toHaveBeenCalledTimes(2);

        tick(250);
        expect(Haptics.vibrate).toHaveBeenCalledTimes(3);
    }));

    // ------------------------------
    // vibrateRest triggers rest sound and two vibrations
    // ------------------------------
    it('vibrateRest plays restSound and vibrates twice (one immediate, one after 250ms)', fakeAsync(() => {
        settingsMock.isSoundRestEnabled.and.returnValue(true);
        settingsMock.isVibrateRestEnabled.and.returnValue(true);

        component.vibrateRest();
        tick();
        expect(NativeAudio.play).toHaveBeenCalled();
        expect(Haptics.vibrate).toHaveBeenCalledTimes(1);

        tick(250);
        expect(Haptics.vibrate).toHaveBeenCalledTimes(2);
    }));

    // ------------------------------
    // clearTimer & ngOnDestroy
    // ------------------------------
    it('clearTimer clears interval', fakeAsync(() => {
        component.interval = setInterval(() => {
        }, 1000);
        component.clearTimer();
        expect(component.interval).toBeNull();
    }));

    it('ngOnDestroy calls clearTimer and allows sleep', fakeAsync(() => {
        spyOn(component, 'clearTimer').and.callThrough();
        component.interval = setInterval(() => {
        }, 1000);
        component.ngOnDestroy();
        tick();
        expect(component.clearTimer).toHaveBeenCalled();
        expect(KeepAwake.allowSleep).toHaveBeenCalled();
    }));

    // ------------------------------
    // formatTime edge cases
    // ------------------------------
    it('formatTime formats time correctly', () => {
        expect(component.formatTime(0)).toBe('00:00.00');
        expect(component.formatTime(65.37)).toBe('01:05.37'); // 1 minute, 5 seconds, .37 -> 37 centiseconds
        expect(component.formatTime(-5)).toBe('00:00.00');
    });

    // ------------------------------
    // abandonActivity
    // ------------------------------
    it('abandonActivity calls sendToCompleted', fakeAsync(() => {
        spyOn(component, 'sendToCompleted').and.callFake(() => {
        });
        component.abandonActivity();
        tick();
        expect(component.sendToCompleted).toHaveBeenCalled();
    }));

});
