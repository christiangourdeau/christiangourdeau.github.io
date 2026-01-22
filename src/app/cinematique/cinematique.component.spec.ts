import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CinematiqueComponent } from './cinematique.component';

describe('CinematiqueComponent', () => {
  let component: CinematiqueComponent;
  let fixture: ComponentFixture<CinematiqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CinematiqueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CinematiqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
