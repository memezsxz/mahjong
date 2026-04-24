import {ApplicationConfig, provideBrowserGlobalErrorListeners,} from '@angular/core';
import {provideRouter} from '@angular/router';
import {appRoutes} from './app.routes';
import {environment} from "../environments/environment";
import { API_URL } from '@hbg/game-data-access';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(appRoutes),
        {
            provide: API_URL,
            useValue: environment.apiUrl
        }
    ],
};
