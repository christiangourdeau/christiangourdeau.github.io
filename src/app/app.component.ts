import { Component } from '@angular/core';
import { Card } from './card.model';
import { CardComponent } from './card/card.component';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BannerComponent } from './banner/banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CardComponent, BannerComponent, RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'site-physique';
  cards: Card[] = [
    { id: 1, title: 'Carte 1', description: 'Description carte 1', imageUrl: 'https://via.placeholder.com/300x150' },
    { id: 2, title: 'Carte 2', description: 'Description carte 2', imageUrl: 'https://via.placeholder.com/300x150' },
    { id: 3, title: 'Carte 3', description: 'Description carte 3', imageUrl: 'https://via.placeholder.com/300x150' },
    { id: 4, title: 'Carte 4', description: 'Description carte 4', imageUrl: 'https://via.placeholder.com/300x150' },
  ]
}
