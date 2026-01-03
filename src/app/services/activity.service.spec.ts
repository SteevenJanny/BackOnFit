import {TestBed} from '@angular/core/testing';
import {ActivityService} from './activity.service';
import {Session} from './session.service';

describe('ActivityService', () => {
    let service: ActivityService;

    let originalRandom: () => number;
    beforeEach(() => {

        originalRandom = Math.random;
        TestBed.configureTestingModule({
            providers: [ActivityService]
        });
        service = TestBed.inject(ActivityService);
    });
    afterEach(() => {
        // restore originals (remove spies)
        (Math.random as any) = originalRandom;
    });
    /* ----------------------------------------------------
     * createTimeActivity
     * ---------------------------------------------------- */
    it('should create a time activity with defaults', () => {
        const a = service.createTimeActivity();

        expect(a.type).toBe('time');
        expect(a.config.iterations).toBe(10);
        expect(a.config.effortTime).toBe(30);
        expect(a.config.restTime).toBe(30);
    });

    it('should override time activity fields when partial provided', () => {
        const a = service.createTimeActivity({
            id: '123',
            name: 'X',
            description: 'Y',
            config: {iterations: 5, effortTime: 45, restTime: 60}
        });

        expect(a.id).toBe('123');
        expect(a.name).toBe('X');
        expect(a.type).toBe('time');
        expect(a.config.iterations).toBe(5);
        expect(a.config.effortTime).toBe(45);
        expect(a.config.restTime).toBe(60);
    });

    /* ----------------------------------------------------
     * createStepActivity
     * ---------------------------------------------------- */
    it('should create a step activity with defaults', () => {
        const a = service.createStepActivity();

        expect(a.type).toBe('step');
        expect(a.config.iterations).toBe(10);
        expect(a.config.restTime).toBe(30);
        expect(a.config.effortTime).toBeNull();
    });

    it('should override fields in step activity', () => {
        const a = service.createStepActivity({
            name: 'Test',
            config: {iterations: 3, restTime: 99, effortTime: null}
        });

        expect(a.name).toBe('Test');
        expect(a.config.iterations).toBe(3);
        expect(a.config.restTime).toBe(99);
        expect(a.config.effortTime).toBeNull();
    });

    /* ----------------------------------------------------
     * changeType
     * ---------------------------------------------------- */
    it('should convert step → time and set default effortTime if null', () => {
        const a = service.createStepActivity();
        expect(a.config.effortTime).toBeNull();

        service.changeType(a, 'time');

        expect(a.type).toBe('time');
        expect(a.config.effortTime).toBe(30); // default
    });

    it('should convert time → step and nullify effortTime', () => {
        const a = service.createTimeActivity({config: {iterations: 5, effortTime: 50, restTime: 10}});

        service.changeType(a, 'step');

        expect(a.type).toBe('step');
        expect(a.config.effortTime).toBeNull();
    });

    /* ----------------------------------------------------
     * generateUUID
     * ---------------------------------------------------- */
    describe('generateUUID', () => {

        beforeEach(() => {
            // Force predictable "random" output for testing
            spyOn(Math, 'random').and.returnValue(0.5); // gives consistent rand base36
            spyOn(Date, 'now').and.returnValue(1_700_000_000_000); // fixed epoch
        });

        it('should generate an ID without a session', () => {
            const activity = service.createTimeActivity();

            const out = service.generateUUID(activity, null);

            // epoch36 = Date.now().toString(36), rand = floor(0.5 * 1296).toString(36)
            expect(out.id).toMatch(/^zzzz-[a-z0-9]+$/);
        });

        it('should generate an ID with session prefix', () => {
            const session: Session = {
                id: 'sess1',
                name: '',
                description: '',
                defaultScheduleTime: undefined,
                version: 1,
                activities: []
            };

            const activity = service.createTimeActivity();
            const out = service.generateUUID(activity, session);

            expect(out.id.startsWith('sess1-')).toBeTrue();
        });

        it('should avoid duplicate IDs inside a session', () => {
            // Override random so the first two calls collide
            // Restore original random first (in case previous spy exists)
            (Math.random as any) = originalRandom;

            // Now produce a controlled sequence by replacing Math.random with a custom function
            let call = 0;
            (Math.random as any) = () => (call++ === 0 ? 0.5 : 0.7);


            const session: Session = {
                id: 'sessX',
                name: '',
                description: '',
                defaultScheduleTime: undefined,
                version: 1,
                activities: [
                    {
                        id: 'sessX-xyz',
                        name: '',
                        description: '',
                        type: 'time',
                        config: {iterations: 1, effortTime: 10, restTime: 10}
                    }
                ]
            };

            const activity = service.createTimeActivity();

            const out = service.generateUUID(activity, session);

            // Ensure duplicate avoided
            expect(out.id).not.toBe('sessX-xyz');
            expect(out.id.startsWith('sessX-')).toBeTrue();
        });

    });

});
