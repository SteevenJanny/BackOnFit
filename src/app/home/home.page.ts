import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonRow,
    IonTitle,
    IonToolbar
} from '@ionic/angular/standalone';

import {
    add,
    calendarOutline,
    createOutline,
    fitnessOutline,
    listCircleOutline,
    playOutline,
    qrCodeOutline,
    scan,
    settingsOutline,
    shareSocialOutline,
    timeOutline,
    trashOutline
} from 'ionicons/icons';
import {addIcons} from "ionicons";
import {TranslatePipe} from "../services/translation/translation.service";
import {Session, SessionService} from "../services/session.service";
import {SessionEditorComponent} from "../shared/session-editor/session-editor.component";
import {AlertController, ModalController} from "@ionic/angular";
import {ActivityEditorComponent} from "../shared/activity-editor/activity-editor.component";
import {ScannerComponent} from "../shared/scanner/scanner.component";
import {SettingsComponent} from "../features/settings/settings.component";
import {Router} from "@angular/router";
import {SessionQrModalComponent} from "../shared/session-qr-modal/session-qr-modal.component";
import {PlannerComponent} from "../shared/planner/planner.component";

addIcons({
    fitnessOutline,
    listCircleOutline,
    calendarOutline,
    settingsOutline,
    playOutline,
    trashOutline,
    timeOutline,
    createOutline,
    qrCodeOutline,
    add, scan, shareSocialOutline
});

@Component({
    selector: 'app-home',
    templateUrl: './home.page.html',
    styleUrls: ['./home.page.scss'],
    standalone: true,
    imports: [TranslatePipe, IonIcon,
        CommonModule, FormsModule, IonHeader, IonTitle, IonToolbar, IonContent, IonButtons, IonButton, IonGrid, IonCol, IonRow, IonCard, IonCardTitle, IonCardSubtitle, IonCardHeader, IonCardContent]
})
export class HomePage implements OnInit {
    private sessionService = inject(SessionService);
    private modalCtrl = inject(ModalController);

    private router: Router = inject(Router);
    private alertCtrl = inject(AlertController);
    private tPipe = inject(TranslatePipe);

    sessions: Session[] = []


    ngOnInit() {
        this.loadSessions();
    }

    async ionViewWillEnter() {
        await this.loadSessions();
    }

    private async loadSessions() {
        this.sessions = await this.sessionService.getAllSessions();
    }


    async openScanner() {
        const modal = await this.modalCtrl.create({
            component: ScannerComponent
        })
        await modal.present();

        modal.onDidDismiss().then(() => {
            this.loadSessions();
        })
    }

    async openSettings() {
        const modal = await this.modalCtrl.create({
            component: SettingsComponent
        })
        await modal.present();
    }

    async openActivityEditor() {
        const modal = await this.modalCtrl.create({
            component: ActivityEditorComponent,
        })
        await modal.present();
    }

    async openCalendar() {
        this.router.navigate(['/calendar']);
    }

    async openShare(session: Session) {
        const modal = await this.modalCtrl.create({
            component: SessionQrModalComponent,
            componentProps: {session},
        });
        await modal.present();
    }

    async openPlanner(session: Session) {
        const modal = await this.modalCtrl.create({
            component: PlannerComponent,
            componentProps: {session: session},
            breakpoints: [0, 0.5, 0.9],
            initialBreakpoint: 0.9
        });
        await modal.present();

        // A bug in ion-datetime makes it ignore min when open in modal... so we set it manually here
        const picker = modal.querySelector('ion-datetime');
        if (picker) {
            picker.min = this.dateToString(new Date());
            const initial = this.sessionService.addDefaultSchedule(new Date(), session);
            picker.value = this.dateToString(initial);
        }
    }

    dateToString(date: Date): string {
        const tzOffset = date.getTimezoneOffset() * 60000; // in ms
        return new Date(date.getTime() - tzOffset)
            .toISOString()
            .split('.')[0] + 'Z';
    }

    async openSessionEditor(session: Session | undefined) {
        if (!session) {
            session = await this.sessionService.createSession();
        }
        const modal = await this.modalCtrl.create({
            component: SessionEditorComponent,
            componentProps: {session: session},
        });
        await modal.present();

        modal.onDidDismiss().then(async () => {
            await this.loadSessions();
        });
    }

    private t(key: string) {
        return this.tPipe.transform(key);
    }

    async deleteSession(session: Session) {
        const alert = await this.alertCtrl.create({
            header: this.t('home.deleteSessionTitle'),
            message: this.t('home.deleteSessionMessage'),
            buttons: [
                {text: this.t('home.cancel'), role: 'cancel'},
                {
                    text: this.t('home.delete'),
                    role: 'destructive',
                    handler: async () => {
                        await this.sessionService.deleteSession(session);
                        await this.loadSessions();
                    }
                }
            ]
        });

        await alert.present();
    }

    async runSession(session: Session) {
        await this.router.navigate(['/run-activity'], {
            queryParams: {session: JSON.stringify(session), currentActivityId: 0}
        });
    }

}

