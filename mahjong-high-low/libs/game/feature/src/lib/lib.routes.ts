import { Route } from '@angular/router';
import { Feature } from './feature/feature';

export const featureRoutes: Route[] = [
  { path: '', component: Feature },
  {
    path: 'game', component: Feature
  },
];
