import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityEditorComponent } from './activity-editor.component';
import { ActivityService } from '../../services/activity.service';
import { DebuggerModeService } from '../../services/debugger.service';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../services/translation/translation.service';

describe('ActivityEditorComponent', () => {

    let fixture: ComponentFixture<ActivityEditorComponent>;
    let component: ActivityEditorComponent;

    let activityServiceMock: jasmine.SpyObj<ActivityService>;
    let debuggerMock: jasmine.SpyObj<DebuggerModeService>;
    let modalMock: jasmine.SpyObj<ModalController>;
    let routerMock: jasmine.SpyObj<Router>;

    beforeEach(async () => {

        activityServiceMock = jasmine.createSpyObj('ActivityService', [
            'createTimeActivity',
            'createStepActivity',
            'changeType'
        ]);

        debuggerMock = jasmine.createSpyObj('DebuggerModeService', ['notify']);
        modalMock = jasmine.createSpyObj('ModalController', ['dismiss']);
        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        // default new activity mocks
        activityServiceMock.createTimeActivity.and.returnValue({ type: 'time', name: '' } as any);
        activityServiceMock.createStepActivity.and.returnValue({ type: 'step', name: '' } as any);

        await TestBed.configureTestingModule({
            imports: [ActivityEditorComponent],
            providers: [
                { provide: ActivityService, useValue: activityServiceMock },
                { provide: DebuggerModeService, useValue: debuggerMock },
                { provide: ModalController, useValue: modalMock },
                { provide: Router, useValue: routerMock },
                TranslatePipe
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ActivityEditorComponent);
        component = fixture.componentInstance;
    });

    // -----------------------------------------------------
    // ngOnInit()
    // -----------------------------------------------------

    it('should create new activity and set editing=false when no input provided', () => {
        component.activity = undefined as any;

        activityServiceMock.createTimeActivity.and.returnValue({ type: 'time' } as any);

        component.ngOnInit();

        expect(component.isEditing).toBeFalse();
        expect(component.activity.type).toBe('time');
        expect(component.chosenActivityType).toBe('time');
    });

    it('should use existing activity and set editing=true', () => {
        component.activity = { type: 'step', name: 'Test' } as any;

        component.ngOnInit();

        expect(component.isEditing).toBeTrue();
        expect(component.chosenActivityType).toBe('step');
    });

    // -----------------------------------------------------
    // ionViewDidEnter()
    // -----------------------------------------------------

    it('should set chosenActivityType and call changeActivityType', () => {
        component.activity = { type: 'step' } as any;
        const spy = spyOn(component, 'changeActivityType');

        component.ionViewDidEnter();

        expect(spy).toHaveBeenCalledWith('step');
    });

    // -----------------------------------------------------
    // createNewActivity()
    // -----------------------------------------------------

    it('should create time activity when chosenActivityType="time"', () => {
        component.chosenActivityType = 'time';
        const activity = component.createNewActivity();

        expect(activityServiceMock.createTimeActivity).toHaveBeenCalled();
        expect(activity.type).toBe('time');
    });

    it('should create step activity when chosenActivityType="step"', () => {
        component.chosenActivityType = 'step';
        const activity = component.createNewActivity();

        expect(activityServiceMock.createStepActivity).toHaveBeenCalled();
        expect(activity.type).toBe('step');
    });

    it('should notify debugger and default to time activity if type is invalid', () => {
        component.chosenActivityType = 'invalid' as any;

        const activity = component.createNewActivity();

        expect(debuggerMock.notify)
            .toHaveBeenCalledWith('Unknown activity type selected in ActivityEditorComponent');

        expect(activityServiceMock.createTimeActivity).toHaveBeenCalled();
        expect(activity.type).toBe('time');
    });

    // -----------------------------------------------------
    // changeActivityType()
    // -----------------------------------------------------

    it('should update DOM selected class and call activityService.changeType', () => {
        // Fake DOM elements
        const btnTime = document.createElement('button');
        btnTime.classList.add('activity-type-btn');
        btnTime.setAttribute('type', 'time');

        const btnStep = document.createElement('button');
        btnStep.classList.add('activity-type-btn');
        btnStep.setAttribute('type', 'step');

        spyOn(document, 'getElementsByClassName').and.returnValue([btnTime, btnStep] as any);

        const oldActivity = { type: 'time' } as any;
        component.activity = oldActivity;

        const newActivity = { type: 'step' };
        activityServiceMock.changeType.and.returnValue(newActivity as any);

        component.changeActivityType('step');

        // DOM
        expect(btnTime.classList.contains('selected')).toBeFalse();
        expect(btnStep.classList.contains('selected')).toBeTrue();

        // Service
        expect(activityServiceMock.changeType).toHaveBeenCalledWith(oldActivity, 'step');
        expect(component.activity).toBe(newActivity as any);
        expect(component.chosenActivityType).toBe('step');
    });

    // -----------------------------------------------------
    // close()
    // -----------------------------------------------------

    it('should dismiss modal on close()', () => {
        component.close();
        expect(modalMock.dismiss).toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // confirm()
    // -----------------------------------------------------

    it('should navigate when creating a new activity', async () => {
        component.isEditing = false;
        component.activity = { type: 'time', name: 'A' } as any;

        await component.confirm();

        expect(routerMock.navigate).toHaveBeenCalledWith(
            ['/run-activity'],
            { queryParams: { activity: JSON.stringify(component.activity) } }
        );
        expect(modalMock.dismiss).toHaveBeenCalledWith(component.activity);
    });

    it('should NOT navigate when editing existing activity', async () => {
        component.isEditing = true;
        component.activity = { type: 'step', name: 'B' } as any;

        await component.confirm();

        expect(routerMock.navigate).not.toHaveBeenCalled();
        expect(modalMock.dismiss).toHaveBeenCalledWith(component.activity);
    });
});
