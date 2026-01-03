import {Component, inject} from '@angular/core';
import {
    IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCol,
    IonContent, IonGrid, IonHeader, IonIcon, IonRow,
    IonTitle, IonToggle, IonToolbar
} from "@ionic/angular/standalone";
import {SettingsService, SettingsModel} from "../../services/settings.service";
import {TranslatePipe, translationService} from "../../services/translation/translation.service";
import {ModalController} from "@ionic/angular";
import {addIcons} from "ionicons";
import {
    arrowBack,
    language,
    globeOutline,
    colorPaletteOutline,
    playCircleOutline,
    informationCircleOutline
} from "ionicons/icons";
import {DebuggerModeService} from "../../services/debugger.service";
import {APP_VERSION} from "../../../main";

addIcons({
    arrowBack,
    language,
    globeOutline,
    colorPaletteOutline,
    playCircleOutline,
    informationCircleOutline
})

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    imports: [
        IonContent,
        IonHeader,
        IonTitle,
        IonToolbar,
        TranslatePipe,
        IonToggle,
        IonButton,
        IonButtons,
        IonIcon,
        IonCard,
        IonRow,
        IonGrid,
        IonCol,
        IonCardTitle,
        IonCardSubtitle,
        IonCardHeader,
        IonCardContent,
    ]
})
export class SettingsComponent {
    private settingsService: SettingsService = inject(SettingsService);
    private modalCtrl = inject(ModalController);
    private debugger = inject(DebuggerModeService);
    private translationService = inject(translationService);

    languages = [
        {code: "en", nativeName: "English", name: "English"},
        {code: "es", nativeName: "Español", name: "Spanish"},
        {code: "fr", nativeName: "Français", name: "French"},
        {code: "de", nativeName: "Deutsch", name: "German"},
        {code: "it", nativeName: "Italiano", name: "Italian"},
    ];

    constructor() {
        const supportedLangs = this.translationService.getSupportedLanguages();
        this.languages.forEach(lang => {
            if (!supportedLangs.includes(lang.code)) {
                this.debugger.notify(`Language ${lang.code} is not supported!`);
                this.languages = this.languages.filter(l => l.code !== lang.code);
            }
        })
    }

    ionViewWillEnter() {
        this.changeLanguage(this.settingsService.getLanguage() || 'en');

    }

    async changeLanguage(langCode: string) {
        // Change btn class to  "lang-btn" + (lang.code === selectedLang ? " selected" : "");
        const btns = document.getElementsByClassName('lang-btn');
        for (let i = 0; i < btns.length; i++) {
            const btn = btns[i];
            if (btn.getAttribute('lang') === langCode) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        }
        this.setSettings(langCode, 'language');
    }

    close() {
        this.modalCtrl.dismiss()
    }

    /* ------------------ SETTERS ------------------ */

    async setSettings(event: any, field: keyof SettingsModel) {
        await this.settingsService.update({[field]: event});
    }


    get isDarkModeEnabled(): boolean {
        return this.settingsService.getTheme() === 'dark';
    }

    get isVibrateEffortEnabled(): boolean {
        return this.settingsService.isVibrateEffortEnabled();
    }

    get isVibrateRestEnabled(): boolean {
        return this.settingsService.isVibrateRestEnabled();
    }

    get isSoundEffortEnabled(): boolean {
        return this.settingsService.isSoundEffortEnabled();
    }

    get isSoundRestEnabled(): boolean {
        return this.settingsService.isSoundRestEnabled();
    }

    get isDebugModeEnabled(): boolean {
        return this.settingsService.getDebugMode();
    }

    protected readonly APP_VERSION = APP_VERSION;
}
