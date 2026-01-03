import {ComponentFixture, TestBed} from '@angular/core/testing';
import {DurationSelectComponent} from './duration-select.component';
import {DebuggerModeService} from '../../../services/debugger.service';
import {Activity} from '../../../services/activity.service';

describe('DurationSelectComponent', () => {

    let component: DurationSelectComponent;
    let fixture: ComponentFixture<DurationSelectComponent>;

    let debugMock: jasmine.SpyObj<DebuggerModeService>;

    const baseActivity = (seconds: number = 125): Activity => ({
        id: 'a1',
        type: 'time',
        config: {
            restTime: seconds
        }
    } as any);

    beforeEach(async () => {
        debugMock = jasmine.createSpyObj('DebuggerModeService', ['notify']);

        await TestBed.configureTestingModule({
            imports: [DurationSelectComponent],
            providers: [
                {provide: DebuggerModeService, useValue: debugMock}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DurationSelectComponent);
        component = fixture.componentInstance;

        component.activity = baseActivity();
        component.propertyName = 'restTime';
        component.title = 'Title';
        component.subtitle = 'Subtitle';
    });

    // ---------------------------------------------------------
    // ngOnInit
    // ---------------------------------------------------------

    it('should initialize selectedMinutes and selectedSeconds from activity config', () => {
        component.ngOnInit();

        expect(component.selectedMinutes).toBe(2);
        expect(component.selectedSeconds).toBe(5);
    });

    it('should notify if activity.config is undefined', () => {
        component.activity = {id: 'a1', type: 'time'} as any;

        component.ngOnInit();

        expect(debugMock.notify).toHaveBeenCalledWith(
            'DurationSelectComponent: activity.config is undefined.'
        );
    });

    it('should notify if propertyName does not exist in config', () => {
        component.propertyName = 'unknownProp';

        component.ngOnInit();

        expect(debugMock.notify).toHaveBeenCalledWith(
            `DurationSelectComponent: property 'unknownProp' does not exist in activity.config.`
        );
    });

    // ---------------------------------------------------------
    // onCustomChange
    // ---------------------------------------------------------

    it('onCustomChange should update minutes and recompute config value', () => {
        component.ngOnInit();

        component.onCustomChange(
            {detail: {value: 3}},  // minutes
            true
        );

        expect(component.selectedMinutes).toBe(3);
        expect(component.activity.config.restTime).toBe(3 * 60 + 5);
    });

    it('onCustomChange should update seconds and recompute config value', () => {
        component.ngOnInit();

        component.onCustomChange(
            {detail: {value: 42}}, // seconds
            false
        );

        expect(component.selectedSeconds).toBe(42);
        expect(component.activity.config.restTime).toBe(2 * 60 + 42);
    });

    // ---------------------------------------------------------
    // onChange
    // ---------------------------------------------------------

    it('onChange should directly update config property', () => {
        component.onChange(90);

        expect(component.activity.config.restTime).toBe(90);
    });

    // ---------------------------------------------------------
    // getters
    // ---------------------------------------------------------

    it('value getter should return property value from config', () => {
        expect(component.value).toBe(125);
    });

    it('getTimeMinutes should return floor(value / 60)', () => {
        expect(component.getTimeMinutes()).toBe(2);
    });

    it('getTimeSeconds should return value % 60', () => {
        expect(component.getTimeSeconds()).toBe(5);
    });

    // ---------------------------------------------------------
    // minutes / seconds arrays
    // ---------------------------------------------------------

    it('should initialize minutes array from 0 to 9', () => {
        expect(component.minutes.length).toBe(10);
        expect(component.minutes[0]).toBe(0);
        expect(component.minutes[9]).toBe(9);
    });

    it('should initialize seconds array from 0 to 59', () => {
        expect(component.seconds.length).toBe(60);
        expect(component.seconds[0]).toBe(0);
        expect(component.seconds[59]).toBe(59);
    });

});
