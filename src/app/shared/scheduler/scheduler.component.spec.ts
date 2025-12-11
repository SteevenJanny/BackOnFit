import {ComponentFixture, TestBed} from '@angular/core/testing';
import {SchedulerComponent} from './scheduler.component';
import {ModalController} from '@ionic/angular';
import {SessionService} from '../../services/session.service';

describe('SchedulerComponent', () => {
    let component: SchedulerComponent;
    let fixture: ComponentFixture<SchedulerComponent>;

    let modalCtrl: jasmine.SpyObj<ModalController>;
    let sessionService: jasmine.SpyObj<SessionService>;

    beforeEach(async () => {
        modalCtrl = jasmine.createSpyObj('ModalController', ['dismiss']);
        sessionService = jasmine.createSpyObj('SessionService', [
            'deserializeDuration',
            'serializeDuration'
        ]);

        await TestBed.configureTestingModule({
            imports: [SchedulerComponent],
            providers: [
                {provide: ModalController, useValue: modalCtrl},
                {provide: SessionService, useValue: sessionService}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SchedulerComponent);
        component = fixture.componentInstance;
    });
    it('should initialize duration from defaultDuration', () => {
        component.defaultDuration = '2h';
        sessionService.deserializeDuration.and.returnValue({
            amount: 2,
            unit: 'hours'
        });

        component.ngOnInit();

        expect(sessionService.deserializeDuration).toHaveBeenCalledWith('2h');
        expect(component.currentAmount).toBe(2);
        expect(component.currentUnit).toBe('hours');
    });
    it('should not initialize duration if defaultDuration is undefined', () => {
        component.defaultDuration = undefined;

        component.ngOnInit();

        expect(sessionService.deserializeDuration).not.toHaveBeenCalled();
    });
    it('should dismiss modal on close', () => {
        component.close();
        expect(modalCtrl.dismiss).toHaveBeenCalled();
    });
    it('should serialize duration and call onChange callback', () => {
        const onChangeSpy = jasmine.createSpy('onChange');
        component.onChange = onChangeSpy;

        component.currentAmount = 3;
        component.currentUnit = 'days';

        sessionService.serializeDuration.and.returnValue('3d');

        component.serialize();

        expect(sessionService.serializeDuration)
            .toHaveBeenCalledWith(3, 'days');
        expect(onChangeSpy).toHaveBeenCalledWith('3d');
    });
    it('should update amount and serialize on amount change', () => {
        spyOn(component, 'serialize');

        component.amountOptions = [1, 2, 3, 4];

        component.onIonChangeAmount({
            detail: {value: '2'}
        });

        expect(component.currentAmount).toBe(2);
        expect(component.serialize).toHaveBeenCalled();
    });
    it('should switch to hours and update amountOptions', () => {
        spyOn(component, 'serialize');

        component.onIonChangeUnit({
            detail: {value: 'hours'}
        });

        expect(component.currentUnit).toBe('hours');
        expect(component.amountOptions.length).toBe(23); // 1–23
        expect(component.serialize).toHaveBeenCalled();
    });
    it('should switch to days and update amountOptions', () => {
        spyOn(component, 'serialize');

        component.onIonChangeUnit({
            detail: {value: 'days'}
        });

        expect(component.currentUnit).toBe('days');
        expect(component.amountOptions.length).toBe(29); // 1–29
        expect(component.serialize).toHaveBeenCalled();
    });

});
