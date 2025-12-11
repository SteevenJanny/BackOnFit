import {Component, Input} from '@angular/core';
import {IonCard, IonCardContent, IonIcon, IonInput, IonItem, IonTextarea} from "@ionic/angular/standalone";
import {TranslatePipe} from "../../../services/translation/translation.service";
import {Activity} from "../../../services/activity.service";
import {FormsModule} from "@angular/forms";
import {addIcons} from "ionicons";
import {documentTextOutline, createOutline} from "ionicons/icons";

addIcons({
    documentTextOutline,
    createOutline,
})

@Component({
    selector: 'app-name-desc-select',
    templateUrl: './name-desc-select.component.html',
    styleUrls: ['./name-desc-select.component.scss'],
    imports: [
        IonCardContent,
        IonIcon,
        IonInput,
        IonItem,
        IonTextarea,
        TranslatePipe,
        IonCard,
        FormsModule
    ]
})
export class NameDescSelectComponent {

    @Input() activity!: Activity;

    constructor() {

    }

}
