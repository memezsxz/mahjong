import { CanDeactivateFn, Route } from '@angular/router';
import { LandingPage } from './features/landing-page/landing-page';
import { GamePage } from './features/game-page/game-page';

const canDeactivateGamePage: CanDeactivateFn<GamePage> = (component) => component.canLeaveGame();

export const appRoutes: Route[] = [
  { path: '', component: LandingPage },
  { path: 'game', component: GamePage, canDeactivate: [canDeactivateGamePage] },
];
