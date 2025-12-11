import {Component, inject, OnInit} from '@angular/core';
import {CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint} from "@capacitor/barcode-scanner";
import {SessionService} from "../../services/session.service";
import {DebuggerModeService} from "../../services/debugger.service";
import {ModalController} from "@ionic/angular";
import {
  IonButton,
  IonButtons,
  IonCard, IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from "@ionic/angular/standalone";
import {TranslatePipe} from "../../services/translation/translation.service";
import {addIcons} from "ionicons";
import {arrowBack, shareSocialOutline, cameraOutline} from "ionicons/icons";

addIcons({
        arrowBack,
        shareSocialOutline,
        cameraOutline
    }
)

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss'],
  imports: [
    IonHeader,
    IonTitle,
    IonToolbar,
    TranslatePipe,
    IonButton,
    IonButtons,
    IonIcon,
    IonContent,
    IonCard,
    IonCardContent,
  ]
})
export class ScannerComponent implements OnInit {

  private sessionService = inject(SessionService);
  private debugger = inject(DebuggerModeService);
  private modalCtrl = inject(ModalController);

  constructor() {

  }

  ngOnInit() {
  }


  close() {
    this.modalCtrl.dismiss();
  }


  async openScanModal() {
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE
      });

      if (result.ScanResult) {
        const session = await this.sessionService.processQR(result.ScanResult);
        if (!session) {
          return;
        }
        await this.sessionService.saveSession(session);
        this.close();
      }
    } catch (err) {
      await this.debugger.notify(`Error during QR scan: ${String(err)}`);
    }
  }

}
