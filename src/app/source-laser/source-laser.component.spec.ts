import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceLaserComponent } from './source-laser.component';

describe('SourceLaserComponent', () => {
  let component: SourceLaserComponent;
  let fixture: ComponentFixture<SourceLaserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SourceLaserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SourceLaserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
