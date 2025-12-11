import {Component, inject, Input, OnInit} from '@angular/core';
import {DatePipe} from "@angular/common";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonPicker,
  IonPickerColumn,
  IonPickerColumnOption, IonText, IonToolbar
} from "@ionic/angular/standalone";
import {ModalController} from "@ionic/angular";
import {SessionService} from "../../services/session.service";
import {TranslatePipe} from "../../services/translation/translation.service";

@Component({
  selector: 'app-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss'],
  imports: [
    IonButton,
    IonButtons,
    IonPicker,
    IonPickerColumn,
    IonPickerColumnOption,
    IonToolbar,
    TranslatePipe
  ]
})
export class SchedulerComponent implements OnInit {

  @Input() onConfirm: any;
  @Input() onChange: any;
  @Input() defaultDuration: string | undefined;
  private modalCtrl: ModalController = inject(ModalController);
  private sessionService: SessionService = inject(SessionService);

  amountOptions = Array.from({length: 24}, (_, i) => i).slice(1); // 1–72 hours/days

  currentUnit: 'minutes' | 'hours' | 'days' = 'hours';
  currentAmount = 2;

  constructor() {
  }

  ngOnInit() {
    this.initDuration()
  }

  initDuration() {
    if (!this.defaultDuration) {
      return;
    }
    const durations = this.sessionService.deserializeDuration(this.defaultDuration);
    this.currentAmount = durations.amount;
    this.currentUnit = durations.unit;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  serialize() {
    const serialized = this.sessionService.serializeDuration(
      this.currentAmount,
      this.currentUnit
    )
    if (this.onChange) {
      this.onChange(serialized);
    }
  }

  onIonChangeAmount(event: any) {
    this.currentAmount = this.amountOptions[+event.detail.value - 1];
    this.serialize();
  }

  onIonChangeUnit(event: any) {
    this.currentUnit = event.detail.value;
    if (this.currentUnit === 'minutes') {
      // Array from 1 to 60
      this.amountOptions = Array.from({length: 60}, (_, i) => i).slice(1);
    } else if (this.currentUnit === 'hours') {
      this.amountOptions = Array.from({length: 24}, (_, i) => i).slice(1);
    } else if (this.currentUnit === 'days') {
      this.amountOptions = Array.from({length: 30}, (_, i) => i).slice(1);
    }
    this.serialize();
  }

}
