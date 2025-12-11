import {Component, inject, Input, OnInit} from '@angular/core';
import {Activity, ActivityService} from "../../services/activity.service";
import {
    IonButton,
    IonButtons,
    IonContent, IonFooter,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar
} from "@ionic/angular/standalone";
import {ModalController} from "@ionic/angular";
import {TranslatePipe} from "../../services/translation/translation.service";
import {addIcons} from "ionicons";
import {closeOutline, checkmarkOutline, arrowBack, walkOutline, timeOutline} from "ionicons/icons";
import {DebuggerModeService} from "../../services/debugger.service";
import {NameDescSelectComponent} from "../component/name-desc-select/name-desc-select.component";
import {IterationSelectComponent} from "../component/iteration-select/iteration-select.component";
import {DurationSelectComponent} from "../component/duration-select/duration-select.component";
import {Router} from "@angular/router";

addIcons({
    closeOutline,
    checkmarkOutline,
    arrowBack,
    walkOutline,
    timeOutline
})

@Component({
    selector: 'app-activity-editor',
    templateUrl: './activity-editor.component.html',
    styleUrls: ['./activity-editor.component.scss'],
    imports: [
        IonButton,
        IonButtons,
        IonHeader,
        IonIcon,
        IonTitle,
        IonToolbar,
        TranslatePipe,
        IonContent,
        NameDescSelectComponent,
        IterationSelectComponent,
        DurationSelectComponent,
        IonFooter,
    ]
})
export class ActivityEditorComponent implements OnInit {

    @Input() activity!: Activity;

    private modalCtrl: ModalController = inject(ModalController);
    private activityService = inject(ActivityService);
    private debugger = inject(DebuggerModeService);
    private route: Router = inject(Router)

    isEditing: boolean = true;
    chosenActivityType: 'time' | 'step' = 'time';

    constructor() {

    }

    ngOnInit() {
        if (!this.activity) {
            this.activity = this.createNewActivity();
            this.isEditing = false;
        } else {
            this.isEditing = true;
        }

        this.chosenActivityType = this.activity.type;
    }

    ionViewDidEnter() {
        this.chosenActivityType = this.activity.type;
        this.changeActivityType(this.chosenActivityType);
    }

    createNewActivity(): Activity {
        if (this.chosenActivityType === 'time') {
            return this.activityService.createTimeActivity();
        } else if (this.chosenActivityType === 'step') {
            return this.activityService.createStepActivity();
        }
        this.debugger.notify('Unknown activity type selected in ActivityEditorComponent');
        return this.activityService.createTimeActivity();
    }

    changeActivityType(type: string) {
        // Change btn class to  "lang-btn" + (lang.code === selectedLang ? " selected" : "");
        const btns = document.getElementsByClassName('activity-type-btn');
        for (let i = 0; i < btns.length; i++) {
            const btn = btns[i];
            if (btn.getAttribute('type') === type) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        }
        this.activity = this.activityService.changeType(this.activity, type as 'time' | 'step');
        this.chosenActivityType = type as 'time' | 'step';

    }


    close() {
        this.modalCtrl.dismiss();
    }

    async confirm() {
        if (!this.isEditing) {
            await this.route.navigate(['/run-activity'], {
                queryParams: {activity: JSON.stringify(this.activity)}
            });
        }
        this.modalCtrl.dismiss(this.activity);
    }
}
