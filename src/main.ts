import {bootstrapApplication} from '@angular/platform-browser';
import {RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules} from '@angular/router';
import {IonicRouteStrategy, provideIonicAngular} from '@ionic/angular/standalone';
import {IonicModule} from '@ionic/angular';
import {routes} from './app/app.routes';
import {AppComponent} from './app/app.component';
import {importProvidersFrom, inject, provideAppInitializer} from '@angular/core';
import SettingsService from "./app/services/settings.service";
import {Capacitor} from "@capacitor/core";
import {defineCustomElements as pwaElements} from '@ionic/pwa-elements/loader';
import {defineCustomElements as jeepSqlite} from 'jeep-sqlite/loader';
import {StorageService} from "./app/services/storage/storage.service";

export const APP_VERSION = '0.0.2';


bootstrapApplication(AppComponent, {
  providers: [
    {provide: RouteReuseStrategy, useClass: IonicRouteStrategy},
    importProvidersFrom(IonicModule.forRoot({innerHTMLTemplatesEnabled: true})),
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideAppInitializer(async () => {

      const platform = Capacitor.getPlatform();
      if (platform === "web") {
        pwaElements(window);
        jeepSqlite(window);
        window.addEventListener('DOMContentLoaded', async () => {
          const jeepEl = document.createElement("jeep-sqlite");
          document.body.appendChild(jeepEl);
          await customElements.whenDefined('jeep-sqlite');
          jeepEl.autoSave = true;
        });
      }
      const storage = inject(StorageService);
      const settings = inject(SettingsService);
      await storage.init();
      await settings.init();
    })
  ]
});
