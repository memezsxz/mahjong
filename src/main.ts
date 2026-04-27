import { provideZoneChangeDetection, isDevMode } from "@angular/core";
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideServiceWorker } from '@angular/service-worker';

bootstrapApplication(App, {...appConfig, providers: [provideZoneChangeDetection(), ...appConfig.providers, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })]})
  .catch((err) => console.error(err));
