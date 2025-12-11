import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
    IonButton,
    IonContent, IonIcon,
} from '@ionic/angular/standalone';
import {ActivatedRoute, Router} from "@angular/router";
import {ModalController} from "@ionic/angular";
import {Session, SessionService} from "../../services/session.service";
import {TranslatePipe} from "../../services/translation/translation.service";
import {addIcons} from "ionicons";
import {
    calendarOutline,
    homeOutline,
    constructOutline,
    refreshOutline,
    arrowForwardCircleOutline,
    checkmarkCircleOutline
} from "ionicons/icons";
import {Activity} from "../../services/activity.service";
import {DebuggerModeService} from "../../services/debugger.service";
import {PlannerComponent} from "../../shared/planner/planner.component";

addIcons({
    calendarOutline,
    homeOutline,
    constructOutline,
    refreshOutline,
    arrowForwardCircleOutline,
    checkmarkCircleOutline,
})

@Component({
    selector: 'app-completed',
    templateUrl: './completed.page.html',
    styleUrls: ['./completed.page.scss'],
    standalone: true,
    imports: [TranslatePipe, IonContent, CommonModule, FormsModule, IonButton, IonIcon]
})
export class CompletedPage implements OnInit {
    session: Session | undefined = undefined;
    lastActivity!: Activity;
    currentActivityId = 0;

    private route: ActivatedRoute = inject(ActivatedRoute);
    private router: Router = inject(Router);
    private sessionService: SessionService = inject(SessionService);
    private debugger: DebuggerModeService = inject(DebuggerModeService);
    private modalCtrl: ModalController = inject(ModalController);

    constructor() {

    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            if (params["session"]) {
                this.session = JSON.parse(params["session"]);
                this.currentActivityId = +params["currentActivityId"];
                if (this.session && this.session.activities.length > 0) {
                    this.lastActivity = this.session.activities[this.currentActivityId];
                } else {
                    this.debugger.notify("CompletedPage: No activities found in session");
                }
            } else if (params["activity"]) {
                this.lastActivity = JSON.parse(params["activity"]);
            }
        });
    }

    repeatActivity() {
        // update id to avoid reuse of the same activity
        this.router.navigate(['/run-activity'], {
            queryParams: {
                session: JSON.stringify(this.session),
                currentActivityId: this.currentActivityId,
                activity: JSON.stringify(this.lastActivity)
            },
        });
    }

    startNextActivity() {
        this.router.navigate(['/run-activity'], {
            queryParams: {session: JSON.stringify(this.session), currentActivityId: this.currentActivityId + 1}
        });
    }

    async openPlannerModal() {
        const modal = await this.modalCtrl.create({
            component: PlannerComponent,
            componentProps: {session: this.session},
            breakpoints: [0, 0.5, 0.9],
            initialBreakpoint: 0.9
        });
        await modal.present();
        // A bug in ion-datetime makes it ignore min when open in modal... so we set it manually here
        const picker = modal.querySelector('ion-datetime');
        if (picker) {
            picker.min = this.dateToString(new Date());
            if (this.session) {
                const initial = this.sessionService.addDefaultSchedule(new Date(), this.session);
                picker.value = this.dateToString(initial);
            }
        }
    }

    dateToString(date: Date): string {
        const tzOffset = date.getTimezoneOffset() * 60000; // in ms
        return new Date(date.getTime() - tzOffset)
            .toISOString()
            .split('.')[0] + 'Z';
    }

    toHome() {
        this.router.navigate(['/home']);
    }
}
