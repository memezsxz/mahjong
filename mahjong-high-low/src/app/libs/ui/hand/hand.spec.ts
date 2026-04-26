import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Hand } from './hand';

describe('Hand', () => {
  let component: Hand;
  let fixture: ComponentFixture<Hand>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hand],
    }).compileComponents();

    fixture = TestBed.createComponent(Hand);
    fixture.componentRef.setInput('hand', {
      total: 5,
      tiles: [],
    });
    fixture.componentRef.setInput('showTileValue', true);
    fixture.componentRef.setInput('showHandTiles', true);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
