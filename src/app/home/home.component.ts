import { Component } from '@angular/core';
import { Card } from '../card.model';
import { CardComponent } from '../card/card.component';
import { BannerComponent } from '../banner/banner.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [CardComponent, BannerComponent, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  cards: Card[] = [
    { id: 'cinematique', title: '', description: '', imageUrl: 'cards/cinematique.jpg' },
    { id: 'coulomb', title: '', description: '', imageUrl: 'cards/coulomb.jpg' },
    { id: 'source-laser', title: '', description: '', imageUrl: 'cards/source_laser.jpg' },
    { id: 'source-ponc', title: '', description: '', imageUrl: 'cards/source_ponc.jpg' },
  ]
}
