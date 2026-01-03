import {ComponentFixture, TestBed} from '@angular/core/testing';
import {IterationSelectComponent} from './iteration-select.component';
import {Activity} from '../../../services/activity.service';

describe('IterationSelectComponent', () => {
    let component: IterationSelectComponent;
    let fixture: ComponentFixture<IterationSelectComponent>;

    const mockActivity = (iterations: number): Activity =>
        ({
            id: 'a1',
            type: 'time',
            config: {
                iterations
            }
        } as Activity);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [IterationSelectComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(IterationSelectComponent);
        component = fixture.componentInstance;
    });

    it('should increment iterations', () => {
        component.activity = mockActivity(3);

        component.updateIterations(1);

        expect(component.activity.config.iterations).toBe(4);
    });

    it('should decrement iterations', () => {
        component.activity = mockActivity(5);

        component.updateIterations(-1);

        expect(component.activity.config.iterations).toBe(4);
    });

    it('should support large increments', () => {
        component.activity = mockActivity(1);

        component.updateIterations(10);

        expect(component.activity.config.iterations).toBe(11);
    });

    it('should mutate the activity object directly', () => {
        const activity = mockActivity(2);
        component.activity = activity;

        component.updateIterations(3);

        // same reference, mutated value
        expect(activity.config.iterations).toBe(5);
    });

    it('should throw if activity is undefined', () => {
        expect(() => component.updateIterations(1)).toThrow();
    });
});
