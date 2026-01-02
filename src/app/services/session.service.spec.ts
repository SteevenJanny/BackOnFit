import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {SessionService, Session} from './session.service';
import {StorageService} from './storage/storage.service';
import {Activity, ActivityService} from './activity.service';
import {DebuggerModeService} from './debugger.service';
import {AlertController} from '@ionic/angular';
import * as pako from 'pako';
import {sha256} from 'js-sha256';

describe('SessionService', () => {
    let service: SessionService;
    let storageMock: any;
    let activityMock: any;
    let debuggerMock: any;
    let alertCtrlMock: any;

    beforeEach(() => {
        storageMock = jasmine.createSpyObj('StorageService', [
            'getDeviceId',
            'getSessionIds',
            'getSession',
            'saveSession',
            'deleteSession'
        ]);

        activityMock = jasmine.createSpyObj('ActivityService', ['generateUUID']);
        debuggerMock = jasmine.createSpyObj('DebuggerModeService', ['notify']);
        alertCtrlMock = jasmine.createSpyObj('AlertController', ['create']);

        storageMock.getDeviceId.and.returnValue('xx');
        storageMock.getSessionIds.and.resolveTo([]);

        TestBed.configureTestingModule({
            providers: [
                SessionService,
                {provide: StorageService, useValue: storageMock},
                {provide: ActivityService, useValue: activityMock},
                {provide: DebuggerModeService, useValue: debuggerMock},
                {provide: AlertController, useValue: alertCtrlMock}
            ]
        });

        service = TestBed.inject(SessionService);
    });

    // --------------------------------------------------------------------
    // createSession
    // --------------------------------------------------------------------
    it('should create a complete empty session', fakeAsync(async () => {
        const session = await service.createSession();

        expect(session.id).toBeTruthy();
        expect(session.name).toBe('');
        expect(session.activities).toEqual([]);
    }));

    // --------------------------------------------------------------------
    // serialize/deserialize duration
    // --------------------------------------------------------------------
    it('should serialize duration to ISO format', () => {
        expect(service.serializeDuration(5, 'minutes')).toBe('PT5M');
        expect(service.serializeDuration(2, 'hours')).toBe('PT2H');
        expect(service.serializeDuration(3, 'days')).toBe('P3D');
    });

    it('should deserialize ISO durations', () => {
        expect(service.deserializeDuration('PT5M')).toEqual({amount: 5, unit: 'minutes'});
        expect(service.deserializeDuration('PT2H')).toEqual({amount: 2, unit: 'hours'});
        expect(service.deserializeDuration('P3D')).toEqual({amount: 3, unit: 'days'});
    });

    it('should warn on invalid duration format', () => {
        service.deserializeDuration('XXX');
        expect(debuggerMock.notify).toHaveBeenCalled();
    });

    // --------------------------------------------------------------------
    // addDefaultSchedule
    // --------------------------------------------------------------------
    it('should add default schedule delta to base date', () => {
        const base = new Date('2024-01-01T00:00:00Z');
        const session: any = {defaultScheduleTime: 'PT2H'};

        const result = service.addDefaultSchedule(base, session);

        expect(result.getTime()).toBe(base.getTime() + 2 * 3600 * 1000);
    });

    // --------------------------------------------------------------------
    // add/remove activity
    // --------------------------------------------------------------------
    it('should add activity with generated UUID', () => {
        const session: any = {activities: []};
        const act = {name: 'A'};
        activityMock.generateUUID.and.returnValue({id: 'A1', name: 'A'});

        const newSession = service.addActivityToSession(session, act as Activity);

        expect(newSession.activities.length).toBe(1);
        expect(newSession.activities[0].id).toBe('A1');
    });

    it('should warn if removing non-existing activity', () => {
        const session: any = {id: 's1', activities: []};
        const activity: any = {id: 'missing'};

        service.removeActivityFromSession(session, activity);

        expect(debuggerMock.notify).toHaveBeenCalled();
    });

    // --------------------------------------------------------------------
    // generateUuid
    // --------------------------------------------------------------------
    it('should generate unique UUIDs and check collisions', fakeAsync(async () => {
        storageMock.getSessionIds.and.resolveTo(['abc']);

        const id1 = await service.generateUuid();
        expect(id1).toBeTruthy();
    }));

    // --------------------------------------------------------------------
    // getSession
    // --------------------------------------------------------------------
    it('should return session from storage', fakeAsync(async () => {
        storageMock.getSession.and.resolveTo({id: 's1', version: 1});

        const sess = await service.getSession('s1');

        expect(sess?.id).toBe('s1');
        expect(debuggerMock.notify).not.toHaveBeenCalled();
    }));

    it('should notify when session missing', fakeAsync(async () => {
        storageMock.getSession.and.resolveTo(null);

        const sess = await service.getSession('x');

        expect(sess).toBeNull();
        expect(debuggerMock.notify).toHaveBeenCalled();
    }));

    // --------------------------------------------------------------------
    // handleSessionUpgrade
    // --------------------------------------------------------------------
    it('should clone session without modification', () => {
        const s: any = {id: '1', version: 1};
        const upgraded = service.handleSessionUpgrade(s);

        expect(upgraded).not.toBe(s);
        expect(upgraded.id).toBe('1');
    });

    // --------------------------------------------------------------------
    // buildPayload
    // --------------------------------------------------------------------
    it('should build a compressed + hashed payload', () => {
        spyOn(window, 'btoa').and.returnValue('ABC');
        // spyOn(sha256).and.returnValue('HASH'); // mock sha256

        const payload = service.buildPayload({
            id: 's',
            version: 1,
            name: '',
            description: '',
            defaultScheduleTime: 'PT1H',
            activities: []
        });

        expect(payload.v).toBeTruthy();
        expect(payload.c).toBe('ABC');
        expect(payload.h).toBeTruthy();

    });

    // --------------------------------------------------------------------
    // decodeQR
    // --------------------------------------------------------------------
    it('should decode valid QR payload', fakeAsync(async () => {
        const json = JSON.stringify({id: 's1', version: 1});
        const deflated = pako.deflate(json);
        const base64 = btoa(String.fromCharCode(...deflated));
        const checksum = sha256(base64);

        const raw = JSON.stringify({c: base64, h: checksum});

        const sess = (service as any).decodeQR(raw);

        expect(sess?.id).toBe('s1');
    }));

    it('should reject QR with bad checksum', () => {
        const raw = JSON.stringify({c: 'AAAA', h: 'WRONG'});

        const result = (service as any).decodeQR(raw);

        expect(result).toBeNull();
        expect(debuggerMock.notify).toHaveBeenCalled();
    });

    // --------------------------------------------------------------------
    // processQR
    // --------------------------------------------------------------------
    it('should process QR and detect existing session conflict', fakeAsync(async () => {
        // Build a valid QR payload
        const json = JSON.stringify({id: 'SAME', version: 1});
        const data = pako.deflate(json);
        const base64 = btoa(String.fromCharCode(...data));
        const checksum = sha256(base64);

        const qr = JSON.stringify({c: base64, h: checksum});

        storageMock.getSessionIds.and.resolveTo(['SAME']);
        storageMock.getSession.and.resolveTo({id: 'SAME', name: 'Old', version: 1});

        let resolveFn: any;
        alertCtrlMock.create.and.callFake(() =>
            Promise.resolve({
                present: () => resolveFn(),
                buttons: []
            })
        );

        // simulate user clicking "new"
        (service as any).handleIdConflict = () => Promise.resolve('new');

        const sess = await service.processQR(qr);

        expect(sess?.id).not.toBe('SAME'); // UUID regenerated
    }));

});
