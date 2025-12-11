import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {PlannerComponent} from './planner.component';
import {SessionService} from '../../services/session.service';
import {NotificationService} from '../../services/notification.service';
import {ModalController, ToastController} from '@ionic/angular';
import {translationService} from '../../services/translation/translation.service';

describe('PlannerComponent', () => {
    let component: PlannerComponent;
    let fixture: ComponentFixture<PlannerComponent>;

    let sessionService: jasmine.SpyObj<SessionService>;
    let notificationService: jasmine.SpyObj<NotificationService>;
    let modalCtrl: jasmine.SpyObj<ModalController>;
    let toastCtrl: jasmine.SpyObj<ToastController>;
    let translation: jasmine.SpyObj<translationService>;

    beforeEach(async () => {
        sessionService = jasmine.createSpyObj('SessionService', ['addDefaultSchedule']);
        notificationService = jasmine.createSpyObj('NotificationService', [
            'createNotificationForSession'
        ]);
        modalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);
        toastCtrl = jasmine.createSpyObj('ToastController', ['create']);
        translation = jasmine.createSpyObj('translationService', ['t', 'getLocale']);

        await TestBed.configureTestingModule({
            imports: [PlannerComponent],
            providers: [
                {provide: SessionService, useValue: sessionService},
                {provide: NotificationService, useValue: notificationService},
                {provide: ModalController, useValue: modalCtrl},
                {provide: ToastController, useValue: toastCtrl},
                {provide: translationService, useValue: translation}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PlannerComponent);
        component = fixture.componentInstance;

        // fake session
        component.session = {
            id: 's1',
            name: '',
            description: '',
            version: 1,
            defaultScheduleTime: 'PT1H',
            activities: []
        };

        // fake ion-datetime picker
        component.picker = {
            value: '',
            el: {
                reset: jasmine.createSpy('reset')
            }
        };

        translation.t.and.callFake(k => k);
        translation.getLocale.and.returnValue('en');

        toastCtrl.create.and.resolveTo({
            present: jasmine.createSpy('present')
        } as any);
    });

    it('should initialize date from session default schedule', () => {
        const base = new Date('2024-01-01T10:00:00Z');
        const scheduled = new Date('2024-01-01T11:00:00Z');

        spyOn(Date, 'now').and.returnValue(base.getTime());
        sessionService.addDefaultSchedule.and.returnValue(scheduled);

        component.ngOnInit();

        expect(component.chosen.getTime()).toBe(scheduled.getTime());
        expect(component.picker.value).toBe(component.initial);
        expect(component.picker.el.reset).toHaveBeenCalled();
    });

    it('should update chosen date on picker change', () => {
        const date = new Date('2024-02-01T12:00:00Z');

        component.onChange({
            detail: { value: date.toISOString() }
        });

        expect(component.chosen.toISOString()).toBe(date.toISOString());
    });


    it('should schedule notification and dismiss modal on success', fakeAsync(async () => {
        notificationService.createNotificationForSession.and.resolveTo(true);

        await component.confirm();
        tick();

        expect(notificationService.createNotificationForSession)
            .toHaveBeenCalledWith(component.session, component.chosen);

        expect(toastCtrl.create).toHaveBeenCalledWith(
            jasmine.objectContaining({ message: 'calendar.notificationScheduled' })
        );

        expect(modalCtrl.dismiss).toHaveBeenCalled();
    }));

    it('should show error toast and not dismiss on failure', fakeAsync(async () => {
        notificationService.createNotificationForSession.and.resolveTo(false);

        await component.confirm();
        tick();

        expect(toastCtrl.create).toHaveBeenCalledWith(
            jasmine.objectContaining({ message: 'calendar.notificationFailed' })
        );

        expect(modalCtrl.dismiss).not.toHaveBeenCalled();
    }));

    it('should dismiss modal on close', () => {
        component.close();
        expect(modalCtrl.dismiss).toHaveBeenCalled();
    });

    it('should return current locale', () => {
        expect(component.getLocale()).toBe('en');
    });





});
