import {Routes} from '@angular/router';
import {HomePage} from "./home/home.page";

export const routes: Routes = [

  {
    path: 'home',
    component: HomePage,
  },
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'run-activity',
    loadComponent: () => import('./features/run-activity/run-activity.page').then(m => m.RunActivityPage)
  },
  {
    path: 'completed',
    loadComponent: () => import('./features/completed/completed.page').then(m => m.CompletedPage)
  },
  {
    path: 'calendar',
    loadComponent: () => import('./features/calendar/calendar.page').then(m => m.CalendarPage)
  },
];
