import { Route } from '@angular/router';
import { Playground } from './playground/playground';

export const appRoutes: Route[] = [
  {
    path: '',
    component: Playground
  },
  // {
  //   path: 'x',
  //   loadChildren: () => import('@hbg/game-feature').then(m => m.featureRoutes)
  // }

];
