import {Component, inject, Input, OnInit} from '@angular/core';
import {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle, IonCol,
    IonGrid,
    IonIcon,
    IonRow
} from "@ionic/angular/standalone";
import {TranslatePipe, translationService} from "../../services/translation/translation.service";
import {Session} from "../../services/session.service";
import {DisplayNotification, NotificationService} from "../../services/notification.service";
import {format, isToday, isTomorrow} from "date-fns";
import {addIcons} from "ionicons";
import {
    notificationsOffOutline,
    calendarOutline,
    timeOutline,
    notificationsOutline,
    trashOutline
} from "ionicons/icons";


addIcons({notificationsOffOutline, calendarOutline, timeOutline, notificationsOutline, trashOutline});

@Component({
    selector: 'app-agenda',
    templateUrl: './agenda.component.html',
    styleUrls: ['./agenda.component.scss'],
    imports: [
        IonCard,
        IonCardHeader,
        IonCardSubtitle,
        IonCardTitle,
        IonIcon,
        TranslatePipe,
        IonGrid,
        IonRow,
        IonCol,
        IonButton
    ]
})
export class AgendaComponent implements OnInit {
    @Input() session!: Session | null;


    private notificationService: NotificationService = inject(NotificationService);
    private translationService: translationService = inject(translationService);

    nextSessions: DisplayNotification[] = [];
    groupedNotifications: { day: string, items: DisplayNotification[] }[] = [];

    constructor() {
    }

    ngOnInit() {
        this.findNextSessions();
    }

    ionViewWillEnter() {
        this.findNextSessions();
    }

    async findNextSessions() {
        this.nextSessions = await this.notificationService.findNextSessions(this.session);
        // group by yyyy-MM-dd
        const groups = new Map<string, DisplayNotification[]>();
        for (const notif of this.nextSessions) {
            const key = format(notif.when, 'yyyy-MM-dd');
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(notif);
        }

        // transform into array
        this.groupedNotifications = Array.from(groups.entries())
            .map(([day, items]) => ({
                day: this.formatDay(day),
                items: items.sort((a, b) => a.when.getTime() - b.when.getTime())
            }))
            .sort((a, b) => a.items[0].when.getTime() - b.items[0].when.getTime());

    }

    formatDay(dateStr: string): string {
        const date = new Date(dateStr);
        if (isToday(date)) return this.t("calendar.today");
        if (isTomorrow(date)) return this.t("calendar.tomorrow");
        return date.toLocaleDateString();
    }

    t(key: string, params?: any): string {
        return this.translationService.t(key, params);
    }

    getLocale(): string {
        return this.translationService.getLocale();
    }

    async removeNotification(notif: DisplayNotification) {
        this.notificationService.removeNotification(notif.id).then(
            () => {
                this.findNextSessions();
            }
        )
    }
}
