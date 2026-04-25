import { Route } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { GamePage } from './game-page/game-page';

export const featureRoutes: Route[] = [
  { path: '',     component: LandingPage },
  { path: 'game', component: GamePage },
];