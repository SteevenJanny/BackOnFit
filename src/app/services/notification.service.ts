import {inject, Injectable} from '@angular/core';
import SettingsService from "./settings.service";
import {DebuggerModeService} from "./debugger.service";
import {LocalNotifications} from "@capacitor/local-notifications";
import {AlertController} from "@ionic/angular";
import {TranslatePipe} from "./translation/translation.service";
import {Session} from "./session.service";
import {translationService} from "./translation/translation.service";

export interface DisplayNotification {
    id: number;
    sessionId: string;
    sessionName: string;
    when: Date;
    delta: string;
}


@Injectable({providedIn: 'root'})
export class NotificationService {

    private debugger: DebuggerModeService = inject(DebuggerModeService);
    private alertCtrl: AlertController = inject(AlertController);
    private translationService: translationService = inject(translationService);

    constructor() {
        this.checkPermission();

    }

    async checkPermission() {
        const permissionStatus = await LocalNotifications.checkPermissions();

        if (permissionStatus.display !== 'granted') {
            const requestStatus = await LocalNotifications.requestPermissions();
            if (requestStatus.display !== 'granted') {
                await this.showAlert(this.t("agenda.permissionDenied"), this.t("agenda.permissionDeniedDesc"));
                return;
            }
        }
    }

    t(key: string, params?: any): string {
        return this.translationService.t(key, params);
    }

    async createNotificationForSession(session: Session, when: Date) {
        const notifTitle = this.t('calendar.notificationTitle', {session: session.name ?? this.t('planner.unnamedSession')});
        const notifBody = this.t('calendar.notificationBody');

        // Make sure the time is in the future
        const now = new Date();
        if (when <= now) {
            this.debugger.notify(`Notification time ${when} is in the past. Skipping notification creation.`);
            return false;
        }
        await LocalNotifications.schedule({
            notifications: [
                {
                    title: notifTitle,
                    body: notifBody,
                    id: Math.floor(when.getTime() / 1000 + Math.random() * 1000),
                    schedule: {at: when},
                    extra: {
                        sessionId: session.id,
                        sessionName: session.name,
                        createdAt: new Date().toISOString()
                    }
                }
            ]
        });
        return true;
    }

    removeNotification(id: number) {
        return LocalNotifications.cancel({notifications: [{id}]});
    }

    async findNextSessions(session: Session | null) {
        try {
            const result = await LocalNotifications.getPending();

            // Sort by scheduled time
            let pendingNotifs = result.notifications
            if (session) {
                // Filter notifications for the given session
                pendingNotifs = pendingNotifs.filter(notif => notif.extra?.sessionId === session.id)
            }

            return this.convertToDisplayNotifications(pendingNotifs);

        } catch (error) {
            await this.debugger.notify(`Error fetching pending notifications: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }

    async convertToDisplayNotifications(pendingNotifs: any[]): Promise<DisplayNotification[]> {
        const displayNotifs: DisplayNotification[] = [];
        const now = new Date();

        for (const notif of pendingNotifs) {

            const when = notif.schedule?.at ? new Date(notif.schedule.at) : new Date();

            const displayNotif: DisplayNotification = {
                id: notif.id,
                sessionId: notif.extra?.sessionId ?? '',
                sessionName: notif.extra?.sessionName ?? this.t('calendar.unnamedSession'),
                when: when,
                delta: this.computeDelta(when, now),
            }
            displayNotifs.push(displayNotif);
        }

        return displayNotifs;
    }

    private computeDelta(when: Date, now: Date) {
        const locale = this.translationService.getLocale();
        const rtf = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'});

        const diffMs = when.getTime() - now.getTime();
        const diffMinutes = Math.round(diffMs / (60 * 1000));

        // If absolute difference > 14 days, show a readable date instead of "in 15 days"
        const diffDays = Math.round(diffMs / (24 * 3600 * 1000));
        if (Math.abs(diffDays) > 14) {
            return new Intl.DateTimeFormat(locale, {weekday: 'short', day: '2-digit', month: 'short'}).format(when);
        }

        if (Math.abs(diffMinutes) < 60) {
            return rtf.format(diffMinutes, 'minute'); // "in 45 minutes" / "45 minutes ago" localized
        }

        const diffHours = Math.round(diffMinutes / 60);
        if (Math.abs(diffHours) < 48) {
            return rtf.format(diffHours, 'hour'); // "in 3 hours"
        }

        // fallback to days
        return rtf.format(diffDays, 'day'); // "in 2 days" / "3 days ago"
    }

    private async showAlert(header: string, message: string) {
        const alert = await this.alertCtrl.create({header, message, buttons: [this.t('common.ok')]});
        await alert.present();
    }

}
