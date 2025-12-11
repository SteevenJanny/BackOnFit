import {Component, inject, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
    IonButton, IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar
} from '@ionic/angular/standalone';
import {TranslatePipe} from "../../services/translation/translation.service";
import {AgendaComponent} from "../../shared/agenda/agenda.component";
import {Router} from "@angular/router";
import {addIcons} from "ionicons";
import {arrowBack} from "ionicons/icons";

addIcons({
    arrowBack
})

@Component({
    selector: 'app-calendar',
    templateUrl: './calendar.page.html',
    styleUrls: ['./calendar.page.scss'],
    standalone: true,
    imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslatePipe, AgendaComponent, IonButton, IonButtons, IonIcon]
})
export class CalendarPage {

    @ViewChild(AgendaComponent) agenda!: AgendaComponent;

    private router: Router = inject(Router);

    close() {
        this.router.navigate(['/home']);
    }

}
