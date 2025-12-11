import { TestBed } from '@angular/core/testing';
import { CompletedPage } from './completed.page';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ModalController } from '@ionic/angular';
import {Session, SessionService} from '../../services/session.service';
import { DebuggerModeService } from '../../services/debugger.service';
import {Activity} from "../../services/activity.service";

describe('CompletedPage', () => {
    let component: CompletedPage;

    let routerMock: any;
    let routeMock: any;
    let modalCtrlMock: any;
    let sessionServiceMock: any;
    let debuggerMock: any;

    beforeEach(async () => {
        routerMock = {
            navigate: jasmine.createSpy('navigate')
        };

        modalCtrlMock = {
            create: jasmine.createSpy('create')
        };

        sessionServiceMock = {
            addDefaultSchedule: jasmine.createSpy('addDefaultSchedule')
        };

        debuggerMock = {
            notify: jasmine.createSpy('notify')
        };

        routeMock = {
            queryParams: of({}) // default, overridable per test
        };

        await TestBed.configureTestingModule({
            imports: [CompletedPage],
            providers: [
                { provide: Router, useValue: routerMock },
                { provide: ActivatedRoute, useValue: routeMock },
                { provide: ModalController, useValue: modalCtrlMock },
                { provide: SessionService, useValue: sessionServiceMock },
                { provide: DebuggerModeService, useValue: debuggerMock },
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(CompletedPage);
        component = fixture.componentInstance;
    });

    // -----------------------------------------------------
    // Initialization tests
    // -----------------------------------------------------

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('ngOnInit should parse session and load lastActivity', () => {
        const session = {
            id: '1',
            name: 'Test Session',
            activities: [{ name: 'A1' }, { name: 'A2' }]
        } as Session;

        routeMock.queryParams = of({
            session: JSON.stringify(session),
            currentActivityId: 1
        });

        component.ngOnInit();

        expect(component.session).toEqual(session);
        expect(component.currentActivityId).toBe(1);
        expect(component.lastActivity).toEqual(session.activities[1]);
    });

    it('ngOnInit should call debugger.notify if session has no activities', () => {
        const session = { id: '1', name: 'Broken Session', activities: [] };

        routeMock.queryParams = of({
            session: JSON.stringify(session),
            currentActivityId: 0
        });

        component.ngOnInit();

        expect(debuggerMock.notify).toHaveBeenCalled();
    });

    it('ngOnInit should parse a standalone activity', () => {
        const activity = { name: 'Solo' } as Activity;

        routeMock.queryParams = of({
            activity: JSON.stringify(activity)
        });

        component.ngOnInit();

        expect(component.lastActivity).toEqual(activity);
    });

    // -----------------------------------------------------
    // Navigation tests
    // -----------------------------------------------------

    it('repeatActivity() should navigate with correct query params', () => {
        component.session = { id: '1', name: 'S', activities: [] } as any;
        component.lastActivity = { name: 'A' } as any;
        component.currentActivityId = 2;

        component.repeatActivity();

        expect(routerMock.navigate).toHaveBeenCalledWith(['/run-activity'], {
            queryParams: {
                session: JSON.stringify(component.session),
                currentActivityId: 2,
                activity: JSON.stringify(component.lastActivity)
            }
        });
    });

    it('startNextActivity() should navigate with incremented activity ID', () => {
        component.session = { id: '1', activities: [] } as any;
        component.currentActivityId = 3;

        component.startNextActivity();

        expect(routerMock.navigate).toHaveBeenCalledWith(['/run-activity'], {
            queryParams: {
                session: JSON.stringify(component.session),
                currentActivityId: 4
            }
        });
    });

    it('toHome() should navigate to /home', () => {
        component.toHome();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
    });

    // -----------------------------------------------------
    // Planner modal
    // -----------------------------------------------------

    it('openPlannerModal() should create modal and set datetime values', async () => {
        const fakeDatetime = {} as any;

        const fakeModalElement: any = {
            present: jasmine.createSpy('present'),
            querySelector: jasmine.createSpy('querySelector').and.returnValue(fakeDatetime)
        };

        modalCtrlMock.create.and.resolveTo(fakeModalElement);

        component.session = { id: '1', activities: [] } as any;

        const initialDate = new Date();
        sessionServiceMock.addDefaultSchedule.and.returnValue(initialDate);

        await component.openPlannerModal();

        expect(modalCtrlMock.create).toHaveBeenCalled();
        expect(fakeModalElement.present).toHaveBeenCalled();

        // datetime patched
        expect(fakeDatetime.min).toBeTruthy();
        expect(fakeDatetime.value).toBeTruthy();
    });

    // -----------------------------------------------------
    // Utility method
    // -----------------------------------------------------

    it('dateToString() should return ISO string without ms and with Z', () => {
        const date = new Date('2020-01-01T12:00:00Z');
        spyOn(date, 'getTimezoneOffset').and.returnValue(0);

        const result = component.dateToString(date);
        expect(result).toMatch(/^2020-01-01T12:00:00Z$/);
    });

});
