import {StorageService} from './storage.service';
import {Capacitor} from '@capacitor/core';
import {SessionService} from '../session.service';
import {DebuggerModeService} from "../debugger.service";
import {TestBed} from "@angular/core/testing";
import {ActivityService} from "../activity.service";

// Simple in-memory fake DB
let fakeSessions: any[] = [];
let fakeActivities: any[] = [];
let fakeConfigs: any[] = [];

// --- Mock DB Connection ---
const mockDB = {
  open: jasmine.createSpy('open').and.resolveTo(),
  execute: jasmine.createSpy('execute').and.callFake(async () => {
  }),

  run: jasmine.createSpy('run').and.callFake(async (query: string, params: any[]) => {

    query = query.replace(/\s+/g, ' ').trim();
    if (query.startsWith('DELETE FROM sessions')) {
      fakeSessions = fakeSessions.filter(s => s.id !== params[0]);
      fakeActivities = fakeActivities.filter(a => a.session_id !== params[0]);
      fakeConfigs = fakeConfigs.filter(c => fakeActivities.some(a => a.id === c.activity_id));
    }

    if (query.startsWith('DELETE FROM activities')) {
      fakeActivities = fakeActivities.filter(a => a.id !== params[0]);
      fakeConfigs = fakeConfigs.filter(c => c.activity_id !== params[0]);
    }

    if (query.startsWith('INSERT OR REPLACE INTO sessions')) {
      const [id, name, description, defaultTime, version] = params;
      fakeSessions = fakeSessions.filter(s => s.id !== id);
      fakeSessions.push({
        id,
        name,
        description,
        default_schedule_time: defaultTime,
        version,
        updated_at: 12345
      });
    }

    if (query.startsWith('INSERT OR REPLACE INTO activities')) {
      const [id, sid, name, description, type, order] = params;
      fakeActivities = fakeActivities.filter(a => a.id !== id);
      fakeActivities.push({
        id,
        session_id: sid,
        name,
        description,
        type,
        order_index: order
      });
    }

    if (query.startsWith('INSERT INTO activity_configs')) {
      const [actId, iters, effort, rest] = params;
      fakeConfigs.push({
        activity_id: actId,
        iterations: iters,
        effort_time: effort,
        rest_time: rest,
        effective_from: Date.now()
      });
    }
  }),

  query: jasmine.createSpy('query').and.callFake(async (query: string, params: any[]) => {
    // Remove extra spaces and newlines for easier matching
    query = query.replace(/\s+/g, ' ').trim();

    if (query.startsWith('SELECT id FROM sessions')) {
      const rows = fakeSessions
        .sort((a, b) => b.updated_at - a.updated_at)
        .map(s => ({id: s.id}));
      return {values: rows};
    }

    if (query.startsWith('SELECT * FROM sessions WHERE id')) {
      const s = fakeSessions.find(s => s.id === params[0]);
      return {values: s ? [s] : []};
    }

    if (query.startsWith('SELECT * FROM activities')) {
      const rows = fakeActivities
        .filter(a => a.session_id === params[0])
        .sort((a, b) => a.order_index - b.order_index);
      return {values: rows};
    }

    if (query.startsWith('SELECT * FROM activity_configs')) {
      const rows = fakeConfigs
        .filter(c => c.activity_id === params[0])
        .sort((a, b) => b.effective_from - a.effective_from);
      return {values: rows.length ? [rows[0]] : []};
    }

    return {values: []};
  })
};

// --- Mock SQLiteConnection ---
const mockSQLite = {
  createConnection: jasmine.createSpy('createConnection').and.resolveTo(mockDB),
  initWebStore: jasmine.createSpy('initWebStore').and.resolveTo()
} as any;


// --- Mock Debugger service ---
const mockDebugger = {notify: jasmine.createSpy('notify')};

describe('StorageService', () => {
  let service: StorageService;
  let sessionService: SessionService;
  let activityService: ActivityService;

  beforeEach(async () => {

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        SessionService,
        ActivityService,
        DebuggerModeService
      ]
    })
// --- Mock Capacitor ---
    spyOn(Capacitor, 'getPlatform').and.returnValue('web');
    // reset fake DB
    fakeSessions = [];
    fakeActivities = [];
    fakeConfigs = [];

    service = TestBed.inject(StorageService);
    sessionService = TestBed.inject(SessionService);
    activityService = TestBed.inject(ActivityService);

    // override SQLite with mock
    (service as any).sqlite = mockSQLite;
    (service as any).debugger = mockDebugger;

    await service.init();
  });

  it('should initialize DB and create device ID', async () => {
    expect(mockSQLite.createConnection).toHaveBeenCalled();
    expect(service.getDeviceId()).toBeTruthy();
  });

  it('should save and retrieve a session with activities and configs', async () => {
    const activity1 = activityService.createTimeActivity({id: 'a1',})
    const activity2 = activityService.createStepActivity({id: 'a2',})
    const session = await sessionService.createSession({
      id: 's1', activities: [activity1, activity2]
    })

    await service.saveSession(session);

    // Check DB internal state
    expect(fakeSessions.length).toBe(1);
    expect(fakeActivities.length).toBe(2);
    expect(fakeConfigs.length).toBe(2);

    const restored = await service.getSession('s1');
    expect(restored).not.toBeNull();
    expect(restored!.activities.length).toBe(2);

    // Check order preserved
    expect(restored!.activities[0].id).toBe('a1');
    expect(restored!.activities[1].id).toBe('a2');
  });

  it('should delete a session and cascade-delete activities/configs', async () => {
    const activity1 = activityService.createTimeActivity({id: 'a1',})
    const session = await sessionService.createSession({
      id: 's2', activities: [activity1]
    })
    await service.saveSession(session);

    expect(fakeSessions.length).toBe(1);

    await service.deleteSession('s2');

    expect(fakeSessions.length).toBe(0);
    expect(fakeActivities.length).toBe(0);
    expect(fakeConfigs.length).toBe(0);
  });

  it('should return session IDs sorted by updated_at desc', async () => {
    // fake some sessions
    fakeSessions.push(
      {id: 'A', updated_at: 50},
      {id: 'B', updated_at: 100}
    );

    const ids = await service.getSessionIds();
    expect(ids).toEqual(['B', 'A']);
  });
});
