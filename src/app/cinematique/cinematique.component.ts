import { Component } from '@angular/core';

@Component({
  selector: 'app-cinematique',
  imports: [],
  templateUrl: './cinematique.component.html',
  styleUrl: './cinematique.component.css'
})
export class CinematiqueComponent {
  myScriptElement: HTMLScriptElement;

  constructor() {
    this.myScriptElement = document.createElement("script");
    this.myScriptElement.src = "scripts/cinematique.js";
    document.body.appendChild(this.myScriptElement);
  }
}
