import {inject, Injectable} from '@angular/core';
import {Activity, ActivityService} from "./activity.service";
import {StorageService} from "./storage/storage.service";
import {DebuggerModeService} from "./debugger.service";
import * as pako from "pako";
import {sha256} from "js-sha256";
import {TranslatePipe} from "./translation/translation.service";
import {AlertController} from "@ionic/angular";


export interface Session {
    version: 1;
    id: string;
    name: string;
    description: string;
    defaultScheduleTime: string | undefined,
    activities: Activity[];
}

@Injectable({providedIn: 'root'})
export class SessionService {

    private alertCtrl: AlertController = inject(AlertController);
    private storageService: StorageService = inject(StorageService)
    private debugger: DebuggerModeService = inject(DebuggerModeService)
    private activityService: ActivityService = inject(ActivityService);

    constructor() {
    }


    async createSession(partial: Partial<Session> = {}): Promise<Session> {
        return {
            version: 1,
            id: partial.id ?? await this.generateUuid(),
            name: partial.name ?? '',
            description: partial.description ?? '',
            defaultScheduleTime: partial.defaultScheduleTime ?? 'PT2H',
            activities: partial.activities ?? [],
        };
    }

    serializeDuration(amount: number, unit: 'minutes' | 'hours' | 'days'): string {
        if (unit === 'minutes') {
            return `PT${amount}M`;
        } else if (unit === 'hours') {
            return `PT${amount}H`;
        } else if (unit === 'days') {
            return `P${amount}D`;
        } else {
            this.debugger.notify(`Unknown duration unit: ${unit}`);
            return `PT${amount}M`;
        }
    }

    deserializeDuration(duration: string): { amount: number, unit: 'minutes' | 'hours' | 'days' } {
        if (!duration || typeof duration !== 'string') {
            this.debugger.notify(`Invalid duration: ${duration}`);
            return {amount: 0, unit: 'minutes'};
        }

        // Days: PnD
        const daysMatch = duration.match(/^P(\d+)D$/);
        if (daysMatch) {
            return {
                amount: Number(daysMatch[1]),
                unit: 'days'
            };
        }

        // Hours: PTnH
        const hoursMatch = duration.match(/^PT(\d+)H$/);
        if (hoursMatch) {
            return {
                amount: Number(hoursMatch[1]),
                unit: 'hours'
            };
        }

        // Minutes: PTnM
        const minutesMatch = duration.match(/^PT(\d+)M$/);
        if (minutesMatch) {
            return {
                amount: Number(minutesMatch[1]),
                unit: 'minutes'
            };
        }

        // Fallback
        this.debugger.notify(`Unknown duration format: ${duration}`);
        return {amount: 0, unit: 'minutes'};
    }


    private parseISODuration(duration: string): number {
        const regex = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/;
        const matches = duration.match(regex);

        if (!matches) return 0;

        const days = parseInt(matches[1] || "0", 10);
        const hours = parseInt(matches[2] || "0", 10);
        const minutes = parseInt(matches[3] || "0", 10);

        return (
            days * 24 * 60 * 60 * 1000 +
            hours * 60 * 60 * 1000 +
            minutes * 60 * 1000
        );
    }

    addDefaultSchedule(baseDate: Date, session: Session): Date {
        const duration = session.defaultScheduleTime;
        if (!duration) {
            return baseDate;
        }
        const delta = this.parseISODuration(duration);
        return new Date(baseDate.getTime() + delta);
    }


    async deleteSession(session: Session): Promise<void> {
        await this.storageService.deleteSession(session.id);
    }

    async saveSession(session: Session): Promise<void> {
        await this.storageService.saveSession(session);
    }

    addActivityToSession(session: Session, activity: Activity): Session {
        activity = this.activityService.generateUUID(activity, session);
        session.activities.push(activity);
        return session;
    }

    removeActivityFromSession(session: Session, activity: Activity): Session {
        const activityId = activity.id;
        if (!session.activities.find(act => act.id === activityId)) {
            this.debugger.notify(`Activity '${activityId}' not found in session '${session.id}'`);
            return session;
        }
        session.activities = session.activities.filter(act => act.id !== activityId);
        return session;
    }

    async generateUuid(): Promise<string> {
        const epoch36 = Date.now().toString(36); // ~6 chars
        const device = this.storageService.getDeviceId();      // 2 chars
        const rand = Math.floor(Math.random() * 1296).toString(36); // 1–2 chars
        let candidate = `${epoch36}${device}${rand}`;

        // Ensure this id does not exist already
        const existingIds = await this.storageService.getSessionIds();
        while (existingIds.includes(candidate)) {
            const newRand = Math.floor(Math.random() * 1296).toString(36);
            candidate = `${epoch36}${device}${newRand}`;
        }
        return candidate;
    }

    async getSession(sessionId: string): Promise<Session | null> {
        let session: Session | null = null;
        try {
            session = await this.storageService.getSession(sessionId);
        } catch (e) {
            await this.debugger.notify(`Failed to load session '${sessionId}': ${String(e)}`);
        }

        if (!session) {
            await this.debugger.notify(`Session '${sessionId}' does not exist in storage.`);
            return null;
        }

        try {
            return this.handleSessionUpgrade(session);
        } catch (e) {
            await this.debugger.notify(`Corrupted session '${sessionId}': ${String(e)}`);
            await this.storageService.deleteSession(sessionId);
            return null;
        }
    }

    async getAllSessions(): Promise<Session[]> {
        const sessionIds = await this.storageService.getSessionIds();
        const sessions: Session[] = [];

        for (const sessionId of sessionIds) {
            try {
                const session = await this.getSession(sessionId);

                if (!session) {
                    await this.debugger.notify(`Session '${sessionId}' could not be retrieved from storage.`);
                }
                sessions.push(session!);
            } catch (e) {
                await this.debugger.notify(`Error loading session '${sessionId}': ${String(e)}`);

            }
        }

        return sessions;
    }

    handleSessionUpgrade(session: Session): Session {
        // Example upgrade logic (currently none needed as version is 1)
        // if (upgradedSession.version === 1) {
        //   // Future upgrade logic goes here
        //   upgradedSession.version = 2;
        // }
        return {...session};
    }

    buildPayload(session: Session) {
        const json = JSON.stringify(session);

        // Compress with pako (string → Uint8Array)
        const compressed = pako.deflate(json);

        // Convert binary → base64
        const compressedBase64 = btoa(String.fromCharCode(...compressed));

        // Compute checksum of compressed data
        const checksum = sha256(compressedBase64);

        return {
            v: 1,
            c: compressedBase64,
            h: checksum
        };
    }

    async processQR(content: string): Promise<Session | null> {
        try {
            const session = this.decodeQR(content);

            if (!session) {
                await this.debugger.notify("Failed to decode session from QR code.");
                return null;
            }

            const sessionIds = await this.storageService.getSessionIds();
            if (sessionIds.includes(session.id)) {
                const action = await this.handleIdConflict(session);

                if (action === "cancel") return null;

                if (action === "new") {
                    session.id = await this.generateUuid();
                }
            }
            return session;


        } catch (e) {
            await this.debugger.notify(`Error processing QR code: ${String(e)}`);
            return null;
        }
    }

    // ------------------------------------------------------------
    // QR Utility
    // ------------------------------------------------------------
    private decodeQR(raw: string): Session | null {
        try {
            const payload = JSON.parse(raw);
            if (!payload.c || !payload.h) {
                this.debugger.notify("QR missing c/h fields");
                return null;
            }

            const checksum = sha256(payload.c);
            if (checksum !== payload.h) {
                this.debugger.notify("QR checksum mismatch");
                return null;
            }

            const binary = Uint8Array.from(atob(payload.c), c => c.charCodeAt(0));
            const json = pako.inflate(binary, {to: 'string'});

            return JSON.parse(json);

        } catch (e) {
            this.debugger.notify(`QR decode error: ${String(e)}`);
            return null;
        }
    }

    // ------------------------------------------------------------
    // Conflict Resolution
    // ------------------------------------------------------------
    private t(key: string, params?: any): string {
        let out = TranslatePipe.prototype.transform(key);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                out = out.replace(`{{${k}}}`, String(v));
            }
        }
        return out;
    }

    private async handleIdConflict(session: Session): Promise<"override" | "new" | "cancel"> {
        const conflictSession = await this.getSession(session.id);


        return new Promise(resolve => {
            this.alertCtrl.create({
                header: this.t('scanner.idConflictHeader'),
                message: this.t('scanner.idConflictMessage', {"name": conflictSession?.name ?? session.id}),
                buttons: [
                    {text: this.t('scanner.cancel'), role: 'cancel', handler: () => resolve("cancel")},
                    {text: this.t('scanner.keepBoth'), role: 'new', handler: () => resolve("new")},
                    {text: this.t('scanner.replace'), role: 'override', handler: () => resolve("override")}
                ]
            }).then(alert => alert.present());
        });
    }
}
