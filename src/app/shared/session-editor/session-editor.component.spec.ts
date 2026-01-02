import {ComponentFixture, TestBed} from '@angular/core/testing';
import {SessionEditorComponent} from './session-editor.component';
import {ModalController, ToastController} from '@ionic/angular';
import {SessionService} from '../../services/session.service';
import {ActivityService} from '../../services/activity.service';
import {DebuggerModeService} from '../../services/debugger.service';
import {Session} from '../../services/session.service';
import {Activity} from '../../services/activity.service';

describe('SessionEditorComponent', () => {
    let component: SessionEditorComponent;
    let fixture: ComponentFixture<SessionEditorComponent>;

    let modalCtrl: jasmine.SpyObj<ModalController>;
    let toastCtrl: jasmine.SpyObj<ToastController>;
    let sessionService: jasmine.SpyObj<SessionService>;
    let activityService: jasmine.SpyObj<ActivityService>;
    let debuggerService: jasmine.SpyObj<DebuggerModeService>;

    beforeEach(async () => {
        modalCtrl = jasmine.createSpyObj('ModalController', ['dismiss', 'create']);
        toastCtrl = jasmine.createSpyObj('ToastController', ['create']);
        sessionService = jasmine.createSpyObj('SessionService', [
            'saveSession', 'addActivityToSession', 'removeActivityFromSession'
        ]);
        activityService = jasmine.createSpyObj('ActivityService', ['createTimeActivity']);
        debuggerService = jasmine.createSpyObj('DebuggerModeService', ['notify']);

        await TestBed.configureTestingModule({
            imports: [SessionEditorComponent],
            providers: [
                {provide: ModalController, useValue: modalCtrl},
                {provide: ToastController, useValue: toastCtrl},
                {provide: SessionService, useValue: sessionService},
                {provide: ActivityService, useValue: activityService},
                {provide: DebuggerModeService, useValue: debuggerService},
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SessionEditorComponent);
        component = fixture.componentInstance;

        component.session.set({
            name: 'Test Session',
            version: 1,
            id: 's1',
            description: "",
            defaultScheduleTime: "",
            activities: []
        } as Session);
    });
    it('should dismiss modal on close', () => {
        component.close();
        expect(modalCtrl.dismiss).toHaveBeenCalled();
    });
    it('should show toast if session name is empty', async () => {
        component.session.set({name: ''} as Session);
        const toast = {present: jasmine.createSpy('present')};
        toastCtrl.create.and.returnValue(Promise.resolve(toast as any));

        await component.confirm();

        expect(toastCtrl.create).toHaveBeenCalled();
        expect(toast.present).toHaveBeenCalled();
        expect(sessionService.saveSession).not.toHaveBeenCalled();
    });
    it('should show toast if session has no activities', async () => {
        const toast = {present: jasmine.createSpy('present')};
        toastCtrl.create.and.returnValue(Promise.resolve(toast as any));

        component.session.update((current) => (
            {...current, activities: [], name: 'My Session'}
        ));
        await component.confirm();

        expect(toastCtrl.create).toHaveBeenCalled();
        expect(toast.present).toHaveBeenCalled();
        expect(sessionService.saveSession).not.toHaveBeenCalled();
    });
    it('should save session and dismiss modal if valid', async () => {
        component.session.update((current) => (
            {...current, activities: [{id: 'a1'} as Activity], name: 'My Session'}
        ))
        await component.confirm();

        expect(sessionService.saveSession).toHaveBeenCalledWith(component.session());
        expect(modalCtrl.dismiss).toHaveBeenCalled();
    });
    it('should replace activity in session after edit', async () => {
        const activity: Activity = {id: 'a1'} as Activity;
        component.session.update((current => ({...current, activities: [activity]})));


        spyOn(component, 'openActivityEditor').and.returnValue(Promise.resolve({id: 'a1', name: 'edited'} as Activity));

        await component.editActivity(activity);

        expect(component.session().activities[0].name).toBe('edited');
    });

    it('should notify if editing activity not in session', async () => {
        spyOn(component, 'openActivityEditor').and.returnValue(Promise.resolve({id: 'a2', name: 'edited'} as Activity));

        component.session.update(current => ({...current, activities: [{id: 'a1'} as Activity]}));

        await component.editActivity({id: 'a2'} as Activity);

        expect(debuggerService.notify).toHaveBeenCalled();
    });
    it('should remove activity from session', () => {
        const activity = {id: 'a1'} as Activity;
        component.session.update(current => ({...current, activities: [activity]}));

        // Make a copy of session for latter comparison
        const session = component.session();

        sessionService.removeActivityFromSession.and.returnValue({...component.session(), activities: []} as Session);

        component.deleteActivity(activity);
        expect(sessionService.removeActivityFromSession).toHaveBeenCalledWith(session, activity);
        expect(component.session().activities.length).toBe(0);
    });
    it('should add activity to session after edit', async () => {
        const newActivity = {id: 'new'} as Activity;
        const editedActivity = {id: 'new', name: 'edited'} as Activity;

        activityService.createTimeActivity.and.returnValue(newActivity);
        spyOn(component, 'openActivityEditor').and.returnValue(Promise.resolve(editedActivity));
        sessionService.addActivityToSession.and.returnValue({
            ...component.session(),
            activities: [editedActivity]
        } as Session);

        await component.addActivity();

        expect(component.session().activities.length).toBe(1);
        expect(component.session().activities[0].name).toBe('edited');
    });
    it('should reorder activities correctly', () => {
        const a1 = {id: 'a1'} as Activity;
        const a2 = {id: 'a2'} as Activity;
        component.session.update(current => ({
            ...current, activities: [
                a1, a2
            ]
        }));

        const event = {detail: {from: 0, to: 1, complete: jasmine.createSpy('complete')}};

        component.reorderActivities(event);

        expect(component.session().activities[0].id).toBe('a2');
        expect(component.session().activities[1].id).toBe('a1');
        expect(event.detail.complete).toHaveBeenCalled();
    });
    it('should format seconds < 60 as seconds', () => {
        expect(component.formatDuration(30)).toBe('30s');
    });

    it('should format seconds >= 60 correctly', () => {
        expect(component.formatDuration(120)).toBe('2m');
        expect(component.formatDuration(125)).toBe('2m 5s');
    });
    it('should update defaultScheduleTime', () => {
        component.updateSchedule('serializedValue');
        expect(component.session().defaultScheduleTime).toBe('serializedValue');
    });
});
