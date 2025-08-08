import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoulombComponent } from './coulomb.component';

describe('CoulombComponent', () => {
  let component: CoulombComponent;
  let fixture: ComponentFixture<CoulombComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoulombComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoulombComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
