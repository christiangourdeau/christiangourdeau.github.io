import { RouterModule, Routes } from '@angular/router';
import { CardComponent } from './card/card.component';
import { NgModule } from '@angular/core';
import { ElementComponent } from './element/element.component';

export const routes: Routes = [
  { path: '', component: CardComponent },
  { path: 'element/:id', component: ElementComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
