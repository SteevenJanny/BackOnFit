import {Injectable, inject} from '@angular/core';
import {ToastController} from '@ionic/angular';
import SettingsService from "./settings.service";
import {distinctUntilChanged, map} from "rxjs/operators";

@Injectable({providedIn: 'root'})
export class DebuggerModeService {

  private settings = inject(SettingsService);
  private toastCtrl = inject(ToastController);
  private enabled = false;

  constructor() {
    this.load();
  }

  private load() {
    this.enabled = this.settings.getDebugMode();
    this.settings.changes.pipe(
      map(s => s.debugMode),
      distinctUntilChanged(),
    ).subscribe(debugMode => {
      if (debugMode !== undefined) {
        this.enabled = debugMode;
      }
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async notify(message: string) {
    console.error('[DEBUG]', message);
    if (!this.enabled) return;

    const toast = await this.toastCtrl.create({
      message,
      duration: 4000,
      color: 'warning',
      position: 'top'
    });

    await toast.present();
  }
}
