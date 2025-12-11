import {Component, inject, Input, OnInit} from '@angular/core';
import {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle, IonChip, IonLabel, IonPicker, IonPickerColumn, IonPickerColumnOption
} from "@ionic/angular/standalone";
import {Activity} from "../../../services/activity.service";
import {DebuggerModeService} from "../../../services/debugger.service";

@Component({
    selector: 'app-duration-select',
    templateUrl: './duration-select.component.html',
    styleUrls: ['./duration-select.component.scss'],
    imports: [
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonCardSubtitle,
        IonCardTitle,
        IonChip,
        IonLabel,
        IonPicker,
        IonPickerColumn,
        IonPickerColumnOption,
    ]
})
export class DurationSelectComponent implements OnInit {

    @Input() activity!: Activity;
    @Input() propertyName!: string;
    @Input() title!: string;
    @Input() subtitle!: string;
    @Input() withStartFromRest: boolean = false;

    private debugger: DebuggerModeService = inject(DebuggerModeService)

    minutes = Array.from({length: 10}, (_, i) => i);
    seconds = Array.from({length: 60}, (_, i) => i);

    selectedMinutes!: number;
    selectedSeconds!: number;


    constructor() {
    }

    ngOnInit() {
        // --- Runtime validation: propertyName must exist in activity.config ---
        const cfg = this.activity?.config as Record<string, unknown>;

        if (!cfg) {
            this.debugger.notify(`DurationSelectComponent: activity.config is undefined.`);
            return;
        }

        if (!(this.propertyName in cfg)) {
            this.debugger.notify(
                `DurationSelectComponent: property '${this.propertyName}' does not exist in activity.config.`
            );
            return;
        }

        this.selectedMinutes = this.getTimeMinutes();
        this.selectedSeconds = this.getTimeSeconds();
    }

    onCustomChange(event: any, isMinutes: boolean) {
        const cfg = this.activity.config as Record<string, any>;
        if (isMinutes) {
            this.selectedMinutes = Number(event.detail.value);
        } else {
            this.selectedSeconds = Number(event.detail.value);
        }
        cfg[this.propertyName] = (this.selectedMinutes * 60) + this.selectedSeconds;
    }

    onChange(n: number) {
        const cfg = this.activity.config as Record<string, any>;
        cfg[this.propertyName] = n;
    }

    get value(): number {
        const actConfig = this.activity.config as Record<string, any>;
        return actConfig[this.propertyName];
    }


    getTimeMinutes(): number {
        const actConfig = this.activity.config as Record<string, any>;
        return Math.floor(actConfig[this.propertyName] / 60);
    }

    getTimeSeconds(): number {
        const actConfig = this.activity.config as Record<string, any>;
        return actConfig[this.propertyName] % 60;
    }
}
