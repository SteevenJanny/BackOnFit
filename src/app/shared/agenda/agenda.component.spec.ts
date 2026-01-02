import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AgendaComponent} from './agenda.component';
import {NotificationService} from '../../services/notification.service';
import {translationService} from '../../services/translation/translation.service';
import {TranslatePipe} from '../../services/translation/translation.service';
import {DisplayNotification} from '../../services/notification.service';

import {format} from 'date-fns';

describe('AgendaComponent', () => {

    let fixture: ComponentFixture<AgendaComponent>;
    let component: AgendaComponent;

    let notifMock: jasmine.SpyObj<NotificationService>;
    let translationMock: jasmine.SpyObj<translationService>;

    const FIXED_TODAY = new Date(2025, 0, 10);  // Jan 10, 2025
    const FIXED_TOMORROW = new Date(2025, 0, 11);
    const FIXED_OTHER = new Date(2025, 0, 15);

    beforeEach(async () => {
        jasmine.clock().install();
        jasmine.clock().mockDate(FIXED_TODAY);

        notifMock = jasmine.createSpyObj('NotificationService', [
            'findNextSessions',
            'removeNotification'
        ]);

        translationMock = jasmine.createSpyObj('translationService', [
            'getLocale',
            't'
        ]);
        translationMock.getLocale.and.returnValue('en');
        translationMock.t.and.callFake((key: string, params?: any) => {
            let out = key;
            if (params) {
                for (const k of Object.keys(params)) {
                    out = out.replace(`{{${k}}}`, params[k]);
                }
            }
            return out;
        });

        // mock translation pipe
        spyOn(TranslatePipe.prototype, 'transform').and.callFake((key: string) => {
            const fakeDict: any = {
                'calendar.today': 'Today',
                'calendar.tomorrow': 'Tomorrow',
            };
            return fakeDict[key] ?? key;
        });

        await TestBed.configureTestingModule({
            imports: [AgendaComponent],
            providers: [
                {provide: NotificationService, useValue: notifMock},
                {provide: translationService, useValue: translationMock},
                TranslatePipe
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AgendaComponent);
        component = fixture.componentInstance;
        component.session = {id: 'S1'} as any;
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    // ----------------------------------------------------
    // ngOnInit / ionViewWillEnter
    // ----------------------------------------------------

    it('should call findNextSessions on ngOnInit', async () => {
        const spy = spyOn(component, 'findNextSessions').and.resolveTo();

        component.ngOnInit();

        expect(spy).toHaveBeenCalled();
    });

    it('should call findNextSessions on ionViewWillEnter', async () => {
        const spy = spyOn(component, 'findNextSessions').and.resolveTo();

        component.ionViewWillEnter();

        expect(spy).toHaveBeenCalled();
    });

    // ----------------------------------------------------
    // findNextSessions()
    // ----------------------------------------------------

    it('should group notifications by day, format days, and sort items', async () => {
        const notifs: DisplayNotification[] = [
            {
                id: 1,
                when: new Date(FIXED_OTHER.getTime() + 3600 * 1000),
                sessionId: 'S1',
                sessionName: 'Session 1',
                delta: ''
            },
            {id: 2, when: FIXED_TODAY, sessionId: 'S1', sessionName: 'Session 1', delta: ''},
            {id: 3, when: FIXED_TOMORROW, sessionId: 'S1', sessionName: 'Session 1', delta: ''},
            {id: 4, when: new Date(FIXED_OTHER.getTime() + 1000), sessionId: 'S1', sessionName: 'Session 1', delta: ''},
        ];

        notifMock.findNextSessions.and.resolveTo(notifs);

        await component.findNextSessions();

        expect(component.groupedNotifications().length).toBe(3);

        // check grouping order (today → tomorrow → other)
        expect(component.groupedNotifications()[0].day).toBe('calendar.today');
        expect(component.groupedNotifications()[1].day).toBe('calendar.tomorrow');
        expect(component.groupedNotifications()[2].day).toBe(FIXED_OTHER.toLocaleDateString());

        // check sorting inside a day
        const otherGroup = component.groupedNotifications()[2].items;
        expect(otherGroup[0].id).toBe(4); // earlier time
        expect(otherGroup[1].id).toBe(1);
    });

    // ----------------------------------------------------
    // formatDay()
    // ----------------------------------------------------

    it('formatDay should return "Today" for today', () => {
        const str = format(FIXED_TODAY, 'yyyy-MM-dd');
        const out = component.formatDay(str);
        expect(out).toBe('calendar.today');
    });

    it('formatDay should return "Tomorrow" for tomorrow', () => {
        const str = format(FIXED_TOMORROW, 'yyyy-MM-dd');
        const out = component.formatDay(str);
        expect(out).toBe('calendar.tomorrow');
    });

    it('formatDay should return locale date for other days', () => {
        const str = format(FIXED_OTHER, 'yyyy-MM-dd');
        const out = component.formatDay(str);
        expect(out).toBe(FIXED_OTHER.toLocaleDateString());
    });
    // ----------------------------------------------------
    // getLocale()
    // ----------------------------------------------------

    it('getLocale should return translationService.getLocale()', () => {
        expect(component.getLocale()).toBe('en');
    });

    // ----------------------------------------------------
    // removeNotification()
    // ----------------------------------------------------

    it('removeNotification should call service.removeNotification and refresh list', async () => {
        notifMock.removeNotification.and.resolveTo();
        const refreshSpy = spyOn(component, 'findNextSessions').and.resolveTo();

        const notif: DisplayNotification = {
            id: 9,
            when: FIXED_TODAY,
            sessionId: 'S1',
            sessionName: 'Session 1',
            delta: ''
        };

        await component.removeNotification(notif);

        expect(notifMock.removeNotification).toHaveBeenCalledWith(9);
        expect(refreshSpy).toHaveBeenCalled();
    });
});
