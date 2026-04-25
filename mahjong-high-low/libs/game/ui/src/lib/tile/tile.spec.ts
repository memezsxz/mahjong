import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tile } from './tile';

describe('Tile', () => {
  let component: Tile;
  let fixture: ComponentFixture<Tile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tile],
    }).compileComponents();

    fixture = TestBed.createComponent(Tile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
