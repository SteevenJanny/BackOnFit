import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {NameDescSelectComponent} from './name-desc-select.component';
import {Activity} from '../../../services/activity.service';
import {FormsModule} from '@angular/forms';
import {By} from '@angular/platform-browser';

describe('NameDescSelectComponent', () => {
    let component: NameDescSelectComponent;
    let fixture: ComponentFixture<NameDescSelectComponent>;

    const mockActivity = (): Activity =>
        ({
            id: 'a1',
            type: 'time',
            name: 'Initial name',
            description: 'Initial description',
            config: {
                iterations: 1
            }
        } as Activity);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                NameDescSelectComponent,
                FormsModule // required for ngModel
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NameDescSelectComponent);
        component = fixture.componentInstance;
        component.activity = mockActivity();
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render initial activity name and description', () => {
        const input = fixture.debugElement.query(By.css('ion-input')).nativeElement;
        const textarea = fixture.debugElement.query(By.css('ion-textarea')).nativeElement;

        expect(input.value).toBe('Initial name');
        expect(textarea.value).toBe('Initial description');
    });

    it('should update activity.name when input changes', fakeAsync(() => {
        const ionInput = fixture.debugElement.query(By.css('ion-input')).nativeElement;

        ionInput.value = 'New name';
        ionInput.dispatchEvent(
            new CustomEvent('ionInput', {
                bubbles: true,
                composed: true,
                detail: { value: 'New name' }
            })
        );

        tick();
        fixture.detectChanges();
        expect(component.activity.name).toBe('New name');
    }));


    it('should update activity.description when textarea changes', fakeAsync( () => {
        const textareaEl = fixture.debugElement.query(By.css('ion-textarea')).nativeElement;

        textareaEl.value = 'New description';
        textareaEl.dispatchEvent(
            new CustomEvent('ionInput', {
                bubbles: true,
                composed: true,
                detail: { value: 'New name' }
            })
        );
        tick();

        fixture.detectChanges();

        expect(component.activity.description).toBe('New description');
    }));

    it('should throw if activity is undefined', () => {
        component.activity = undefined as any;
        expect(() => fixture.detectChanges()).toThrow();
    });
});
