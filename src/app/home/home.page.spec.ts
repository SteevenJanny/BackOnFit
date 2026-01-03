import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {HomePage} from './home.page';
import {ModalController, AlertController} from '@ionic/angular';
import {Session, SessionService} from '../services/session.service';
import {TranslatePipe} from '../services/translation/translation.service';
import {Router} from '@angular/router';

describe('HomePage', () => {

    let component: HomePage;

    // ---- MOCKS ----
    let sessionServiceMock: any;
    let modalCtrlMock: any;
    let alertCtrlMock: any;
    let routerMock: any;
    let translateMock: any;

    beforeEach(async () => {

        sessionServiceMock = {
            getAllSessions: jasmine.createSpy('getAllSessions').and.resolveTo([
                {id: '1', name: 'S1'},
                {id: '2', name: 'S2'}
            ]),
            createSession: jasmine.createSpy('createSession').and.resolveTo({id: 'NEW', name: 'New session'}),
            deleteSession: jasmine.createSpy('deleteSession').and.resolveTo(),
            addDefaultSchedule: jasmine.createSpy('addDefaultSchedule').and.callFake((date: Date) => date)
        };

        modalCtrlMock = {
            create: jasmine.createSpy('create').and.callFake(component => {
                return Promise.resolve({
                    present: jasmine.createSpy('present').and.resolveTo(),
                    onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({})),
                    querySelector: jasmine.createSpy('querySelector').and.returnValue(null) // default: no datetime inside
                });
            })
        };

        alertCtrlMock = {
            create: jasmine.createSpy('create').and.callFake(opts => {
                return Promise.resolve({
                    present: jasmine.createSpy('present').and.resolveTo(),
                    ...opts
                });
            })
        };

        routerMock = {
            navigate: jasmine.createSpy('navigate')
        };

        translateMock = {
            transform: (key: string) => `t:${key}`
        };

        await TestBed.configureTestingModule({
            imports: [HomePage],
            providers: [
                {provide: SessionService, useValue: sessionServiceMock},
                {provide: ModalController, useValue: modalCtrlMock},
                {provide: AlertController, useValue: alertCtrlMock},
                {provide: Router, useValue: routerMock},
                {provide: TranslatePipe, useValue: translateMock}
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(HomePage);
        component = fixture.componentInstance;
    });

    // --------------------------------------------------------------------
    // INIT
    // --------------------------------------------------------------------
    it('should load sessions on ngOnInit', fakeAsync(() => {
        component.ngOnInit();
        tick();
        expect(sessionServiceMock.getAllSessions).toHaveBeenCalled();
        expect(component.sessions().length).toBe(2);
    }));

    it('should reload sessions on ionViewWillEnter', fakeAsync(() => {
        component.ionViewWillEnter();
        tick();
        expect(sessionServiceMock.getAllSessions).toHaveBeenCalled();
    }));

    // --------------------------------------------------------------------
    // MODALS
    // --------------------------------------------------------------------
    it('openScanner should open modal and reload sessions when dismissed', fakeAsync(() => {
        component.openScanner();
        tick();

        expect(modalCtrlMock.create).toHaveBeenCalled();
        expect(sessionServiceMock.getAllSessions).toHaveBeenCalled(); // initial call + reload after dismiss
    }));

    it('openSettings should open modal', fakeAsync(() => {
        component.openSettings();
        tick();
        expect(modalCtrlMock.create).toHaveBeenCalled();
    }));

    it('openActivityEditor should open modal', fakeAsync(() => {
        component.openActivityEditor();
        tick();
        expect(modalCtrlMock.create).toHaveBeenCalled();
    }));

    it('openShare should pass session props', fakeAsync(() => {
        const session = {id: '1', name: 'S1'};

        component.openShare(session as Session);
        tick();

        expect(modalCtrlMock.create).toHaveBeenCalledWith(jasmine.objectContaining({
            componentProps: {session}
        }));
    }));

    it('openPlanner should set datetime if present', fakeAsync(() => {
        const datetimeMock = {
            min: '',
            value: ''
        };

        // override querySelector for this test
        modalCtrlMock.create.and.callFake(() =>
            Promise.resolve({
                present: jasmine.createSpy('present').and.resolveTo(),
                onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({})),
                querySelector: jasmine.createSpy('querySelector').and.returnValue(datetimeMock)
            })
        );

        const session = {id: '1', name: 'S1'};

        component.openPlanner(session as Session);
        tick();

        expect(datetimeMock.min).toBeTruthy();
        expect(datetimeMock.value).toBeTruthy();
    }));

    it('openSessionEditor should create new session if undefined', fakeAsync(() => {
        component.openSessionEditor(undefined);
        tick();

        expect(sessionServiceMock.createSession).toHaveBeenCalled();
        expect(modalCtrlMock.create).toHaveBeenCalled();
    }));

    // --------------------------------------------------------------------
    // NAVIGATION
    // --------------------------------------------------------------------
    it('openCalendar should navigate to /calendar', async () => {
        await component.openCalendar();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/calendar']);
    });

    it('runSession should navigate to run-activity with params', async () => {
        const session = {id: '1', name: 'S1'};
        await component.runSession(session as Session);

        expect(routerMock.navigate).toHaveBeenCalledWith(
            ['/run-activity'],
            jasmine.objectContaining({
                queryParams: jasmine.any(Object)
            })
        );
    });

    // --------------------------------------------------------------------
    // DELETE SESSION
    // --------------------------------------------------------------------
    it('deleteSession should show alert', fakeAsync(() => {
        const session = {id: '1', name: 'S1'};

        component.deleteSession(session as Session);
        tick();

        expect(alertCtrlMock.create).toHaveBeenCalled();
    }));

    // --------------------------------------------------------------------
    // dateToString
    // --------------------------------------------------------------------
    it('dateToString should produce a UTC ISO string', () => {
        const date = new Date('2020-01-01T12:00:00Z');
        const str = component.dateToString(date);

        expect(str.endsWith('Z')).toBeTrue();
        expect(str).toContain('2020-01-01');
    });

});
