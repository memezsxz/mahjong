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
    fixture.componentRef.setInput('tile', {
      id: 'tile-1',
      currentValue: 3,
      imagePath: 'assets/tiles/bamboo-3.png',
    });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
