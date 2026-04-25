import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () => import('@hbg/game-feature').then((m) => m.featureRoutes),
  },
];