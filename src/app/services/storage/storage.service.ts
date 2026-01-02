import {inject, Injectable} from "@angular/core";
import {Preferences} from "@capacitor/preferences";
import {Session} from "../session.service";
import {CapacitorSQLite, SQLiteConnection, SQLiteDBConnection} from "@capacitor-community/sqlite";
import {DB_NAME, DB_VERSION, CREATE_SCHEMA} from "./db-schema";
import {Capacitor} from "@capacitor/core";
import {DebuggerModeService} from "../debugger.service";
import {Activity} from "../activity.service";
import {DbKeyService} from './db-key.service';

@Injectable({providedIn: 'root'})
export class StorageService {
    private deviceId: string | null = null;

    private sqlite: SQLiteConnection;
    private db!: SQLiteDBConnection;
    private initialized: boolean = false;
    private bootstrapped: boolean = false;

    private debugger = inject(DebuggerModeService)

    constructor() {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);

    }

    async bootstrapDb(): Promise<void> {
        if (this.bootstrapped) return;

        if (Capacitor.getPlatform() !== 'web') {
            const isEncryptionSet = await this.sqlite.isSecretStored();
            console.log('StorageService: isEncryptionSet=', isEncryptionSet);
            const key = await DbKeyService.getOrCreateKey();
            if (key && !isEncryptionSet.result) {
                await this.sqlite.setEncryptionSecret(key);
            }
        }
        this.bootstrapped = true;
    }

    async init(): Promise<void> {
        if (this.initialized) return;
        await this.bootstrapDb();

        if (Capacitor.getPlatform() === "web") {
            await this.sqlite.initWebStore();
        }

        const encrypted = Capacitor.getPlatform() !== 'web';
        this.db = await this.sqlite.createConnection(
            DB_NAME,
            encrypted,
            encrypted ? 'secret' : 'no-encryption',
            DB_VERSION,
            false
        );

        await this.db.open();
        await this.db.execute(CREATE_SCHEMA);
        this.initialized = true;
        await this.initDeviceId();
    }

    private async initDeviceId(): Promise<void> {
        const {value} = await Preferences.get({key: 'deviceId'});

        if (value) this.deviceId = value;

        // create a tiny random base36 id, length=2
        const newId = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
        await Preferences.set({key: 'deviceId', value: newId});

        this.deviceId = newId;
    }

    // Base helpers
    private async run(query: string, params: any[] = []): Promise<void> {
        await this.db.run(query, params);
    }

    private async query(query: string, params: any[] = []): Promise<any[]> {
        if (!this.db) {
            await this.debugger.notify('Database not initialized yet.');
            return [];
        }
        const result = await this.db.query(query, params);
        return result.values || [];
    }

    /*---------- PUBLIC METHODS ----------*/

    /*DEVICE ID*/
    getDeviceId(): string | null {
        return this.deviceId;
    }

    /*SESSIONS*/
    async getSessionIds(): Promise<string[]> {
        const out = await this.query(
            `SELECT id
             FROM sessions
             ORDER BY updated_at DESC`
        )
        return out.map(row => row.id);
    }

    private async getSessionEntity(sessionId: string): Promise<any> {
        // Retrieve list of attributes for a session
        const rows = await this.query(`SELECT id,
                                              name,
                                              description,
                                              default_schedule_time,
                                              version,
                                              created_at,
                                              updated_at
                                       FROM sessions
                                       WHERE id = ?`, [sessionId]);
        return rows?.[0] ?? null;
    }

    private async getActivities(sessionId: string) {
        return await this.query(
            `SELECT id, session_id, name, description, type, order_index, session_id
             FROM activities
             WHERE session_id = ?
             ORDER BY order_index ASC`,
            [sessionId]
        );
    }

    private async getLatestConfig(activityId: string) {
        const rows = await this.query(
            `SELECT id, activity_id, iterations, effort_time, rest_time, effective_from, created_at, activity_id
             FROM activity_configs
             WHERE activity_id = ?
             ORDER BY effective_from DESC LIMIT 1`,
            [activityId]
        );
        return rows?.[0] ?? null;
    }

    async getSession(sessionId: string): Promise<Session | null> {
        const sessionRaw = await this.getSessionEntity(sessionId);
        if (!sessionRaw) {
            return null;
        }
        const session: Session = {
            id: sessionRaw.id,
            name: sessionRaw.name,
            description: sessionRaw.description,
            defaultScheduleTime: sessionRaw.default_schedule_time,
            version: sessionRaw.version,
            activities: []
        };

        const activities = await this.getActivities(sessionId);
        // sort activities by order_index
        activities.sort((a, b) => a.order_index - b.order_index);
        for (const a of activities) {
            const cfg = await this.getLatestConfig(a.id);
            const activity: Activity = {
                id: a.id,
                name: a.name,
                description: a.description,
                type: a.type,
                config: {
                    iterations: cfg.iterations,
                    effortTime: cfg.effort_time,
                    restTime: cfg.rest_time,
                }
            }
            session.activities.push(activity);
        }
        return session;
    }

    async deleteSession(sessionId: string): Promise<void> {
        // Foreign keys cascade deletes activities + configs + logs
        await this.run(`DELETE
                        FROM sessions
                        WHERE id = ?`, [sessionId]);
    }


    async deleteActivity(activityId: string) {
        await this.run(`DELETE
                        FROM activities
                        WHERE id = ?`, [activityId]);
    }

    async insertSession(session: any) {
        const query = `
            INSERT
            OR REPLACE INTO sessions
      (id, name, description, default_schedule_time, version, updated_at)
      VALUES (?, ?, ?, ?, ?, strftime('%s','now'))
        `;
        await this.run(query, [
            session.id,
            session.name,
            session.description,
            session.defaultScheduleTime ?? null,
            session.version ?? 1,
        ]);
    }

    async insertActivity(activity: any) {
        const query = `
            INSERT
            OR REPLACE INTO activities
      (id, session_id, name, description, type, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
        `;
        await this.run(query, [
            activity.id,
            activity.session_id,
            activity.name,
            activity.description,
            activity.type,
            activity.order_index ?? 0,
        ]);
    }


    async insertActivityConfig(activityId: string, config: any) {
        const query = `
            INSERT INTO activity_configs
                (activity_id, iterations, effort_time, rest_time, effective_from)
            VALUES (?, ?, ?, ?, strftime('%s', 'now'))
        `;
        await this.run(query, [
            activityId,
            config.iterations,
            config.effortTime ?? null,
            config.restTime,
        ]);
    }

    async saveSession(session: Session): Promise<void> {
        // Save base session metadata
        await this.insertSession(session);

        // Load existing activities for diffing
        const existing = await this.getActivities(session.id);
        const incomingIds = session.activities.map((a: any) => a.id);

        // Delete removed activities
        for (const old of existing) {
            if (!incomingIds.includes(old.id)) {
                await this.deleteActivity(old.id)
            }
        }

        for (let i = 0; i < session.activities.length; i++) {
            const act = session.activities[i];
            await this.insertActivity({
                id: act.id,
                session_id: session.id,
                name: act.name,
                description: act.description,
                type: act.type,
                order_index: i
            })
            const cfg = act.config;
            await this.insertActivityConfig(act.id, {
                iterations: cfg.iterations,
                effortTime: cfg.effortTime,
                restTime: cfg.restTime,
            })
        }

    }
}
