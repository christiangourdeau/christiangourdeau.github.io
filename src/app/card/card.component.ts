import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Card } from '../card.model';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
  standalone: true
})
export class CardComponent {
  @Input() card: Card = { id: '', title: '', description: '', imageUrl: '' };

  constructor(private router: Router) {}

  navigateToDetail() {
    this.router.navigate(['/', this.card.id]);
  }
}
