import { TestBed } from '@angular/core/testing';
import { CalendarPage } from './calendar.page';
import { Router } from '@angular/router';
import { AgendaComponent } from '../../shared/agenda/agenda.component';

describe('CalendarPage', () => {
    let component: CalendarPage;
    let routerMock: any;

    beforeEach(async () => {
        routerMock = {
            navigate: jasmine.createSpy('navigate')
        };

        await TestBed.configureTestingModule({
            imports: [CalendarPage],
            providers: [
                { provide: Router, useValue: routerMock }
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(CalendarPage);
        component = fixture.componentInstance;

        // Mock the ViewChild
        component.agenda = jasmine.createSpyObj('AgendaComponent', ['dummy']);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('close() should navigate to /home', () => {
        component.close();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
    });
});
