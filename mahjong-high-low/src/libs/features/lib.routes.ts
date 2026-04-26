import { CanDeactivateFn, Route } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { GamePage } from './game-page/game-page';

const canDeactivateGamePage: CanDeactivateFn<GamePage> = (component) =>
  component.canLeaveGame();

export const featureRoutes: Route[] = [
  { path: '',     component: LandingPage },
  { path: 'game', component: GamePage, canDeactivate: [canDeactivateGamePage] },
];
