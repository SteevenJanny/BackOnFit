import {Component, inject, Input} from '@angular/core';
import {
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonCol,
    IonContent,
    IonFooter,
    IonGrid,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonReorder,
    IonReorderGroup,
    IonRow,
    IonTitle,
    IonToolbar
} from "@ionic/angular/standalone";
import {TranslatePipe, translationService} from "../../services/translation/translation.service";
import {ModalController, ToastController} from "@ionic/angular";
import {addIcons} from "ionicons";
import {
    add,
    checkmarkOutline,
    closeOutline,
    documentTextOutline, flashOutline,
    listOutline, pauseOutline, repeatOutline,
    timeOutline,
    walkOutline, arrowBack, saveOutline
} from "ionicons/icons";
import {Session, SessionService} from "../../services/session.service";
import {FormsModule} from "@angular/forms";
import {Activity, ActivityService} from "../../services/activity.service";
import {ActivityEditorComponent} from "../activity-editor/activity-editor.component";
import {DebuggerModeService} from "../../services/debugger.service";
import {SchedulerComponent} from "../scheduler/scheduler.component";

addIcons({
    closeOutline,
    checkmarkOutline,
    documentTextOutline,
    listOutline,
    add,
    walkOutline,
    timeOutline,
    repeatOutline,
    flashOutline,
    pauseOutline,
    arrowBack,
    saveOutline
})

@Component({
    selector: 'app-session-editor',
    templateUrl: './session-editor.component.html',
    styleUrls: ['./session-editor.component.scss'],
    imports: [
        IonButtons,
        IonHeader,
        IonTitle,
        IonToolbar,
        TranslatePipe,
        IonButton,
        IonIcon,
        IonCard,
        IonCardContent,
        IonContent,
        IonInput,
        IonItem,
        FormsModule,
        IonCardHeader,
        IonCardTitle,
        IonCardSubtitle,
        IonReorderGroup,
        IonChip,
        IonReorder,
        SchedulerComponent,
        IonGrid,
        IonRow,
        IonCol,
        IonFooter
    ]
})
export class SessionEditorComponent {
    @Input() session!: Session;

    private modalCtrl: ModalController = inject(ModalController);
    private sessionService: SessionService = inject(SessionService);
    private activityService: ActivityService = inject(ActivityService);
    private debugger: DebuggerModeService = inject(DebuggerModeService);
    private toastCtrl = inject(ToastController);
    private translationService = inject(translationService);

    constructor() {

    }

    close() {
        this.modalCtrl.dismiss();
    }

    async confirm() {

        if (!this.session.name) {
            await this.toastCtrl.create({
                message: this.translationService.t("sessionEdit.nameRequiredToast"),
                duration: 2000,
                color: 'danger',
            }).then(toast => toast.present());
            return;
        } else if (this.session.activities.length === 0) {
            await this.toastCtrl.create({
                message: this.translationService.t("sessionEdit.activitiesRequiredToast"),
                duration: 2000,
                color: 'danger',
            }).then(toast => toast.present());
            return;
        }
        await this.sessionService.saveSession(this.session);
        await this.modalCtrl.dismiss();
    }

    async editActivity(activity: Activity) {
        const editedActivity = await this.openActivityEditor(activity);
        if (editedActivity) {
            const index = this.session.activities.findIndex(a => a.id === activity.id);
            if (index !== -1) {
                this.session.activities[index] = editedActivity;
            } else {
                await this.debugger.notify("Trying to edit an activity that does not exist in the session");
            }
        }
    }

    async openActivityEditor(activity: Activity) {
        const editableActivity: Activity = JSON.parse(JSON.stringify(activity));

        const modal = await this.modalCtrl.create({
            component: ActivityEditorComponent,
            componentProps: {activity: editableActivity, withNameDesc: true},
        })
        await modal.present();

        const {data} = await modal.onDidDismiss<Activity>();
        if (data) {
            return data
        }
        return;
    }

    deleteActivity(activity: Activity) {
        this.session = this.sessionService.removeActivityFromSession(this.session, activity)

    }

    async addActivity() {
        const activity: Activity = this.activityService.createTimeActivity();
        const editedActivity = await this.openActivityEditor(activity);
        if (editedActivity) {
            this.session = this.sessionService.addActivityToSession(this.session, editedActivity);
        }
    }

    /** Handle reorder event */
    reorderActivities(event: any) {
        const from = event.detail.from;
        const to = event.detail.to;
        const moved = this.session.activities.splice(from, 1)[0];
        this.session.activities.splice(to, 0, moved);
        event.detail.complete();
    }

    formatDuration(seconds: number): string {
        if (seconds < 60) {
            return `${seconds}s`;
        } else {
            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
        }
    }

    updateSchedule(serializedDelta: string) {
        this.session.defaultScheduleTime = serializedDelta;
    }

}
