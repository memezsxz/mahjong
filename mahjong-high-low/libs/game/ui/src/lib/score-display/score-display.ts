import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'lib-score-display',
  imports: [DecimalPipe],
  templateUrl: './score-display.html',
  styleUrl: './score-display.css',
})
export class ScoreDisplay {
  score = input.required<number>();
  winStreak = input.required<number>();
}