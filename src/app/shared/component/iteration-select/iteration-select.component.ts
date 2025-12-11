import {Component, Input} from '@angular/core';
import {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle, IonIcon
} from "@ionic/angular/standalone";
import {TranslatePipe} from "../../../services/translation/translation.service";
import {Activity} from "../../../services/activity.service";
import {addIcons} from "ionicons";
import {addCircleOutline, removeCircleOutline} from "ionicons/icons";

addIcons({
    addCircleOutline,
    removeCircleOutline,
})

@Component({
    selector: 'app-iteration-select',
    templateUrl: './iteration-select.component.html',
    styleUrls: ['./iteration-select.component.scss'],
    imports: [
        IonButton,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonCardSubtitle,
        IonCardTitle,
        IonIcon,
        TranslatePipe
    ]
})
export class IterationSelectComponent {

    @Input() activity!: Activity;

    constructor() {

    }

    updateIterations(count: number) {
        this.activity.config.iterations += count;
    }

}
