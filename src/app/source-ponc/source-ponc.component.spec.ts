import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SourcePoncComponent } from './source-ponc.component';

describe('SourcePoncComponent', () => {
  let component: SourcePoncComponent;
  let fixture: ComponentFixture<SourcePoncComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SourcePoncComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SourcePoncComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
