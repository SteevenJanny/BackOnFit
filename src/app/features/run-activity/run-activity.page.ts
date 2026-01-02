import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
    IonButton,
    IonButtons, IonCard, IonCardContent, IonCol,
    IonContent, IonFooter, IonGrid,
    IonHeader, IonIcon, IonProgressBar, IonRow,
    IonTitle,
    IonToolbar
} from '@ionic/angular/standalone';
import {NativeAudio} from '@capacitor-community/native-audio';

import {Router, ActivatedRoute} from '@angular/router';
import {Session} from "../../services/session.service";
import {Activity} from "../../services/activity.service";
import {Haptics} from '@capacitor/haptics';
import {KeepAwake} from '@capacitor-community/keep-awake';
import {
    constructOutline,
    homeOutline,
    calendarOutline,
    arrowForwardCircleOutline,
    refreshOutline,
    playSkipForwardOutline,
    playOutline,
    flameOutline,
    pauseCircleOutline,
    stopOutline,
    arrowBack,
    flagOutline
} from 'ionicons/icons';
import {addIcons} from "ionicons";
import {TranslatePipe} from "../../services/translation/translation.service";
import {DebuggerModeService} from "../../services/debugger.service";
import SettingsService from "../../services/settings.service";

addIcons({
    constructOutline,
    homeOutline,
    calendarOutline,
    arrowForwardCircleOutline,
    refreshOutline,
    playSkipForwardOutline,
    playOutline,
    flameOutline,
    pauseCircleOutline,
    stopOutline,
    arrowBack,
    flagOutline
});

@Component({
    selector: 'app-run-activity',
    templateUrl: './run-activity.page.html',
    styleUrls: ['./run-activity.page.scss'],
    standalone: true,
    imports: [TranslatePipe, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonButtons, IonCard, IonCardContent, IonFooter, IonIcon, IonProgressBar, IonGrid, IonCol, IonRow]
})
export class RunActivityPage implements OnInit {

    session: Session | undefined = undefined;
    currentActivityId = 0;
    currentActivity!: Activity;
    currentIteration = 1;
    isRunning = false;
    phase = signal<'ready' | 'effort' | 'rest' | 'done'>('ready');
    timeLeft=signal<number>(0);
    readyTime: number = 3;

    interval: any = null;
    _callback: any = null;

    private route: ActivatedRoute = inject(ActivatedRoute);
    private router: Router = inject(Router);
    private debugger: DebuggerModeService = inject(DebuggerModeService);
    private settingService: SettingsService = inject(SettingsService);

    constructor() {
        this.preloadSounds();
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            KeepAwake.keepAwake();
            try {
                this.bootstrapFromParams(params);
            } catch (err: any) {
                this.debugger.notify(`Fatal error in RunActivityPage: ${err?.message ?? err}`);
                this.router.navigate(['/home']);
                return;
            }
        });
    }

    async preloadSounds() {
        try {
            await NativeAudio.preload({
                assetId: 'effortSound',
                assetPath: 'effort.mp3',
                audioChannelNum: 1,
                isUrl: false
            });

            await NativeAudio.preload({
                assetId: 'restSound',
                assetPath: 'rest.mp3',
                audioChannelNum: 1,
                isUrl: false
            });

            await NativeAudio.preload({
                assetId: 'finishedSound',
                assetPath: 'completed.mp3',
                audioChannelNum: 1,
                isUrl: false
            });
        } catch (err) {
            this.debugger.notify(`Fatal error in RunActivityPage: ${err}`);
        }
    }

    async playSound(assetId: string) {
        try {
            await NativeAudio.play({
                assetId,
                time: 0
            });
        } catch (err) {
            // Browser fallback: create short beep
            const audio = new Audio(`assets/sounds/${assetId}.mp3`);
            audio.play().catch(() => {
            });
        }
    }


    ionViewWillEnter() {
        this.isRunning = false;
    }

    async close() {
        this.isRunning = false;
        await NativeAudio.unload({
            assetId: 'effortSound'
        });
        await NativeAudio.unload({
            assetId: 'restSound'
        });
        await NativeAudio.unload({
            assetId: 'finishedSound'
        })
        this.router.navigate(['/home']);
    }

    private async bootstrapFromParams(params: any) {
        // Case A: Directly provided activity
        if (params['activity']) {
            try {
                this.currentActivity = JSON.parse(params['activity']) as Activity;
            } catch {
                await this.debugger.notify("Invalid 'activity' parameter: not valid JSON")
            }

            if (!this.currentActivity) {
                await this.debugger.notify("Activity param provided but could not parse it")
            }
            this.session = undefined;
        }

        // Case B: Provided session and activity id
        else if (params['session']) {
            try {
                this.session = JSON.parse(params['session']) as Session;
            } catch {
                await this.debugger.notify("Invalid 'session' parameter: not valid JSON")
            }
            if (!this.session) {
                await this.debugger.notify("Loaded session is invalid or has no activities");
            } else if (params["currentActivityId"] === undefined) {
                await this.debugger.notify("Missing 'currentActivityId' parameter");
            }
            this.currentActivityId = +params["currentActivityId"];

            if (
                this.session && (
                    isNaN(this.currentActivityId) ||
                    this.currentActivityId < 0 ||
                    this.currentActivityId >= this.session.activities.length
                )
            ) {
                await this.debugger.notify(`Invalid 'currentActivityId' parameter: out of bounds`);
            }
            if (this.session) {
                this.currentActivity = this.session.activities[this.currentActivityId];
            }
        }

        this.isRunning = false;
        this.currentIteration = 0;
        this.timeLeft.set(0);

        this.phase.set('ready');
        this.startReadyPhase();
    }

    startReadyPhase() {
        this.phase.set('ready');
        this._callback = this.isReadyPhaseDone;
        this.timeLeft.set(this.readyTime); // 3 seconds

        if (this.isRunning) {
            this.runTimer();
        }
    }

    isReadyPhaseDone = () => {
        this.clearTimer();
        // After ready, start the first iteration effort
        this.currentIteration = 1;
        this.startEffortPhase();
    };


    step() {
        this.currentIteration++;
        if (this.currentIteration > this.currentActivity.config.iterations) {
            this.sendToCompleted();
        } else {
            this.startEffortPhase();
        }
    }

    sendToCompleted() {
        this.isRunning = false;
        this.clearTimer();
        this.vibrateDone();
        this.router.navigate(['/completed'], {
            queryParams: {
                session: JSON.stringify(this.session),
                currentActivityId: this.currentActivityId,
                activity: JSON.stringify(this.currentActivity)
            }
        });
    }

    startEffortPhase() {
        this.phase.set('effort');
        this._callback = this.isEffortPhaseDone
        if (this.currentActivity.type == "time") {
            this.timeLeft.set(this.currentActivity.config.effortTime ?? 0);
            if (this.isRunning) {
                this.runTimer();
                this.vibrateEffort();
            }
        } else {
            this.isRunning = true;
            this.vibrateEffort();
        }
    }

    isEffortPhaseDone() {
        this.clearTimer();
        // If that was the last iteration, go to completed
        if (this.currentIteration == this.currentActivity.config.iterations) {
            this.sendToCompleted();
            return;
        }
        // Otherwise, send to rest phase if any
        if (this.currentActivity.config.restTime > 0) {
            this.startRestPhase();
        } else {
            this.step();
        }
    }

    startRestPhase() {
        this.phase.set('rest');
        this._callback = this.isRestPhaseDone
        this.timeLeft.set(this.currentActivity.config.restTime);
        if (this.isRunning) {
            this.runTimer();
            this.vibrateRest();
        }
    }

    isRestPhaseDone() {
        this.clearTimer();
        this.step();
    }

    startOrPause() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.runTimer();
            if (this.phase() === 'ready') {
                this.vibrateEffort(); // Could customize if you want
            } else if (this.phase() === 'effort') {
                this.vibrateEffort();
            } else if (this.phase() === 'rest') {
                this.vibrateRest();
            }
        } else {
            this.isRunning = false;
            this.clearTimer();
        }
    }

    skipPhase() {
        this.clearTimer();
        this._callback();
    }

    ngOnDestroy() {
        this.clearTimer();
        KeepAwake.allowSleep();
    }

    clearTimer() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    runTimer() {
        this.interval = setInterval(() => {
            if (this.timeLeft() > 0) {
                this.timeLeft.set(this.timeLeft()- 0.01);
            } else {
                this.timeLeft.set(0.0);
                this._callback();
            }
        }, 10);
    }


    async vibrateEffort() {
        if (this.phase() === "ready") {
            return;
        }
        if (this.settingService.isSoundEffortEnabled()) {
            await this.playSound('effortSound');
        }
        if (this.settingService.isVibrateEffortEnabled()) {
            await Haptics.vibrate({duration: 500});
        }
    }

    async vibrateDone() {
        if (this.settingService.isSoundRestEnabled()) {
            await this.playSound('finishedSound');
        }
        if (this.settingService.isVibrateRestEnabled()) {
            await Haptics.vibrate({duration: 250});
            setTimeout(() => Haptics.vibrate({duration: 250}), 250);
            setTimeout(() => Haptics.vibrate({duration: 250}), 500);
        }

    }

    async vibrateRest() {
        if (this.settingService.isSoundRestEnabled()) {
            await this.playSound('restSound');
        }
        if (this.settingService.isVibrateRestEnabled()) {
            await Haptics.vibrate({duration: 250});
            setTimeout(() => Haptics.vibrate({duration: 250}), 250);
        }
    }

    formatTime(totalSeconds: number): string {
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);
        let milliseconds = Math.floor((totalSeconds % 1) * 100);

        // Clip everything to 0
        minutes = Math.max(0, minutes);
        seconds = Math.max(0, seconds);
        milliseconds = Math.max(0, milliseconds);

        return `${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    abandonActivity() {
        this.sendToCompleted()
    }
}
