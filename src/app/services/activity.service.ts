import {Injectable} from "@angular/core";
import {Session} from "./session.service";

export type ActivityType = 'time' | 'step';

export interface Activity {
    id: string;
    name: string;
    description: string;
    type: ActivityType;
    config: {
        iterations: number;
        restTime: number;
        effortTime: number | null;
    }
}

@Injectable({providedIn: 'root'})
export class ActivityService {

    constructor() {
    }

    createTimeActivity(partial: Partial<Activity> = {}): Activity {
        return {
            id: partial.id ?? '',
            name: partial.name ?? '',
            description: partial.description ?? '',
            type: 'time',
            config: {
                iterations: partial.config?.iterations ?? 10,
                effortTime: partial.config?.effortTime ?? 30,
                restTime: partial.config?.restTime ?? 30,
            }
        };
    }

    createStepActivity(partial: Partial<Activity> = {}): Activity {
        return {
            id: partial.id ?? '',
            name: partial.name ?? '',
            description: partial.description ?? '',
            type: 'step',
            config: {
                iterations: partial.config?.iterations ?? 10,
                restTime: partial.config?.restTime ?? 30,
                effortTime: null
            }
        };
    }


    changeType(activity: Activity, newType: ActivityType): Activity {
        activity.type = newType;
        if (newType === 'time') {
            if (activity.config.effortTime === null) {
                activity.config.effortTime = 30; // default effort time
            }
        } else if (newType === 'step') {
            activity.config.effortTime = null;
        }
        return activity
    }

    generateUUID(activity: Activity, session: Session | null): Activity {
        const epoch36 = Date.now().toString(36); // ~6 chars
        const sessionIdPart = session ? session.id : 'zzzz';
        const rand = Math.floor(Math.random() * 1296).toString(36); // 1–2 chars
        activity.id = `${sessionIdPart}-${epoch36}${rand}`;
        if (session) {
            const existingIds = session.activities.map(a => a.id);
            while (existingIds.includes(activity.id)) {
                const newRand = Math.floor(Math.random() * 1296).toString(36);
                activity.id = `${sessionIdPart}-${epoch36}${newRand}`;
            }
        }
        return activity;
    }

}
