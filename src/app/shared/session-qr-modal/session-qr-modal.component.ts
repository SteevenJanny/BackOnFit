import {Component, inject, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {toDataURL} from "qrcode";
import {Session, SessionService} from "../../services/session.service";
import {
    IonButton,
    IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonSpinner,
    IonTitle,
    IonToolbar
} from "@ionic/angular/standalone";
import {addIcons} from "ionicons";
import {closeOutline, arrowBack} from "ionicons/icons";
import {TranslatePipe} from "../../services/translation/translation.service";

@Component({
    selector: 'app-session-qr-modal',
    templateUrl: './session-qr-modal.component.html',
    imports: [
        IonHeader,
        IonToolbar,
        IonTitle,
        IonContent,
        IonSpinner,
        TranslatePipe,
        IonButton,
        IonButtons,
        IonIcon,
        IonCard,
        IonCardHeader,
        IonCardTitle,
        IonCardSubtitle,
        IonCardContent
    ],
    styleUrls: ['./session-qr-modal.component.scss']
})
export class SessionQrModalComponent implements OnInit {

    @Input() session!: Session;
    qrDataUrl: string | null = null;
    loading = true;
    private sessionService: SessionService = inject(SessionService);
    private modalCtrl: ModalController = inject(ModalController);

    async ngOnInit() {
        const payload = this.sessionService.buildPayload(this.session);
        await this.generateQR(payload);
        this.loading = false;
    }

    async generateQR(payload: any) {
        const data = JSON.stringify(payload);
        this.qrDataUrl = await toDataURL(data, {
            margin: 1,
            errorCorrectionLevel: 'M'
        });
    }

    close() {
        this.modalCtrl.dismiss();
    }

    constructor() {
        addIcons({closeOutline, arrowBack});
    }
}
