import {Component, inject, Input, OnInit, ViewChild} from '@angular/core';
import {Session, SessionService} from "../../services/session.service";
import {NotificationService} from "../../services/notification.service";
import {
  IonButton,
  IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from "@ionic/angular/standalone";
import {TranslatePipe, translationService} from "../../services/translation/translation.service";
import {addIcons} from "ionicons";
import {
  checkmarkOutline,
  closeOutline,
  closeCircleOutline,
  notificationsOffOutline,
  notificationsOutline
} from "ionicons/icons";
import {ModalController, ToastController} from "@ionic/angular";
import {AgendaComponent} from "../agenda/agenda.component";

@Component({
  selector: 'app-planner',
  templateUrl: './planner.component.html',
  styleUrls: ['./planner.component.scss'],
  imports: [
    IonButton,
    IonButtons,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    TranslatePipe,
    IonContent,
    IonDatetime,
    AgendaComponent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonCardSubtitle
  ]
})
export class PlannerComponent implements OnInit {

  @Input() session!: Session;
  private sessionService: SessionService = inject(SessionService);
  private notificationService: NotificationService = inject(NotificationService);
  private modalCtrl: ModalController = inject(ModalController);
  private toastCtrl: ToastController = inject(ToastController);
  private translationService: translationService = inject(translationService);

  now: Date = new Date();
  initial = ""
  chosen: Date = new Date();

  constructor() {
    addIcons({
      closeOutline,
      checkmarkOutline,
      closeCircleOutline,
      notificationsOffOutline,
      notificationsOutline
    })
  }

  ngOnInit() {
    this.initDate();
  }

  @ViewChild('picker', {static: true}) picker!: any;

  initDate() {
    this.now = new Date();
    let initial = new Date();
    if (this.session) {
      initial = this.sessionService.addDefaultSchedule(this.now, this.session);
    } else {
      initial = new Date(this.now.getTime() + 3600 * 1000); // +1h
    }
    this.initial = this.dateToString(initial);
    this.chosen = initial;
    this.picker.value = this.initial;
    (this.picker.el as IonDatetime).reset(this.initial);
  }

  dateToString(date: Date): string {
    const tzOffset = date.getTimezoneOffset() * 60000; // in ms
    const out = new Date(date.getTime() - tzOffset)
      .toISOString()
      .split('.')[0] + 'Z'; // remove milliseconds
    return out;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async confirm() {
    const result = await this.notificationService.createNotificationForSession(this.session, this.chosen);
    if (!result) {
      await this.showToast(this.translationService.t('calendar.notificationFailed'));
      return;
    }
    await this.showToast(this.translationService.t('calendar.notificationScheduled'));
    await this.modalCtrl.dismiss();
  }

  getLocale(): string {
    return this.translationService.getLocale();
  }

  onChange(ev: any) {
    this.chosen = new Date(ev.detail.value);
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({message, duration: 1200, color: 'success', position: 'top'});
    await toast.present();
  }
}
