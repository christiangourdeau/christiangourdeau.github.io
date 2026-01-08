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
    { file: 'analyse_cinematique.html', title: '', description: '', imageUrl: 'cards/cinematique.jpg' },
    { file: 'loi_coulomb.html', title: '', description: '', imageUrl: 'cards/coulomb.jpg' },
    { file: 'source_laser.html', title: '', description: '', imageUrl: 'cards/source_laser.jpg' },
    { file: 'source_ponc.html', title: '', description: '', imageUrl: 'cards/source_ponc.jpg' },
  ]
}
