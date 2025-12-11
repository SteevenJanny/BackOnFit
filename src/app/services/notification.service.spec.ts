import {TestBed} from '@angular/core/testing';
import {NotificationService} from './notification.service';
import {DebuggerModeService} from './debugger.service';
import {AlertController} from '@ionic/angular';
import {Session} from './session.service';
import {LocalNotifications} from "@capacitor/local-notifications";

describe('NotificationService', () => {
  let service: NotificationService;

  const debuggerSpy = jasmine.createSpyObj('DebuggerModeService', ['notify']);

  const alertSpy = jasmine.createSpyObj('AlertController', ['create']);
  const alertInstance = jasmine.createSpyObj('HTMLIonAlertElement', ['present']);
  alertSpy.create.and.resolveTo(alertInstance);

  let spyRequestPermissions: jasmine.Spy;
  let spyCheckPermissions: jasmine.Spy;
  let spySchedule: jasmine.Spy;
  let spyGetPending: jasmine.Spy;
  let spyCancel: jasmine.Spy;

  beforeEach(() => {
    spyRequestPermissions = spyOn(LocalNotifications, 'requestPermissions').and.callThrough();
    spyCheckPermissions = spyOn(LocalNotifications, 'checkPermissions').and.callThrough();
    spySchedule = spyOn(LocalNotifications, 'schedule').and.callThrough();
    spyGetPending = spyOn(LocalNotifications, 'getPending').and.callThrough();
    spyCancel = spyOn(LocalNotifications, 'cancel').and.callThrough();

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        {provide: DebuggerModeService, useValue: debuggerSpy},
        {provide: AlertController, useValue: alertSpy},
      ]
    });

    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request permission if not granted', async () => {
    alertSpy.create.calls.reset();
    spyCheckPermissions.and.resolveTo({display: 'denied'});
    spyRequestPermissions.and.resolveTo({display: 'granted'});
    await service.checkPermission();

    expect(spyRequestPermissions).toHaveBeenCalled();
    expect(alertSpy.create).not.toHaveBeenCalled();
  });

  it('should show alert if permission still denied', async () => {
    alertSpy.create.calls.reset();
    alertInstance.present.calls.reset();
    spyCheckPermissions.and.resolveTo({display: 'denied'});
    spyRequestPermissions.and.resolveTo({display: 'denied'});
    await service.checkPermission();

    expect(alertSpy.create).toHaveBeenCalled();
    expect(alertInstance.present).toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // createNotificationForSession()
  // -------------------------------------------------------------
  it('should NOT schedule a notification for a time in the past', async () => {
    const session = {id: '1', name: 'Test Session'} as Session;

    const past = new Date(Date.now() - 3600_000);

    const result = await service.createNotificationForSession(session, past);

    expect(result).toBeFalse();
    expect(debuggerSpy.notify).toHaveBeenCalled();
    expect(spySchedule).not.toHaveBeenCalled();
  });

  it('should schedule a notification for a future date', async () => {
    const session = {id: '1', name: 'ABC'} as Session;

    const when = new Date(Date.now() + 3600_000);

    const result = await service.createNotificationForSession(session, when);

    expect(result).toBeTrue();
    expect(spySchedule).toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // removeNotification()
  // -------------------------------------------------------------
  it('should call cancel when removing a notification', async () => {
    await service.removeNotification(123);
    expect(spyCancel).toHaveBeenCalledWith({
      notifications: [{id: 123}]
    });
  });

  // -------------------------------------------------------------
  // findNextSessions()
  // -------------------------------------------------------------
  it('should return filtered notifications for a session', async () => {
    const mockedNotif = {
      id: 1,
      schedule: { at: new Date().toISOString() },
      extra: {
        sessionId: 'abc',
        sessionName: 'S1'
      }
    };

    (spyGetPending as jasmine.Spy).and.resolveTo({
      notifications: [mockedNotif]
    });

    const session = { id: 'abc', name: 'S1' } as Session;

    const result = await service.findNextSessions(session);

    expect(result.length).toBe(1);
    expect(result[0].sessionId).toBe('abc');
  });

  it('should return empty array and log error on failure', async () => {
    (spyGetPending as jasmine.Spy).and.rejectWith(new Error('fail'));

    const res = await service.findNextSessions(null);

    expect(res).toEqual([]);
    expect(debuggerSpy.notify).toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // convertToDisplayNotifications()
  // -------------------------------------------------------------
  it('should convert raw notifications into display notifications', async () => {
    const date = new Date(Date.now() + 3600_000);

    const pending = [{
      id: 10,
      schedule: { at: date.toISOString() },
      extra: { sessionId: '1', sessionName: 'Test' }
    }];

    const result = await service.convertToDisplayNotifications(pending);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(10);
    expect(result[0].sessionName).toBe('Test');
    expect(result[0].when instanceof Date).toBeTrue();
  });

  // -------------------------------------------------------------
  // computeDelta()
  // -------------------------------------------------------------
  it('should compute minutes delta correctly', () => {
    const now = new Date();
    const when = new Date(now.getTime() + 15 * 60_000);

    const delta = (service as any).computeDelta(when, now);

    expect(delta).toContain('minute');
  });

  it('should compute days delta for large differences', () => {
    const now = new Date();
    const when = new Date(now.getTime() + 20 * 24 * 3600_000);

    const delta = (service as any).computeDelta(when, now);

    // Should be formatted as date, not "in XX days"
    expect(delta).not.toContain('day');
  });
});
