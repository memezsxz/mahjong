import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('mahjong-high-low');
}
