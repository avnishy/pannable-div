import { Injectable } from '@angular/core';
import { Card } from '../models/card';

@Injectable({
  providedIn: 'root'
})
export class CardService {

  constructor() { }

  getCards(): Card[] {
    const cards = [
      {
        x: 200, ox: 200, y: 100, oy: 100, width: 200, height: 100, color: 'orange', type: 'color', id: '1', image: "url('https://www.tutorialspoint.com/images/seaborn-4.jpg?v=2')", z:1
      },
      {
        x: 200, ox: 200, y: 250, oy: 250, width: 200, height: 100, color: 'blue', type: 'color', id: '2', image: "url('https://www.tutorialspoint.com/images/seaborn-4.jpg?v=2')", z: 2
      },
      {
        x: 400, ox: 400, y: 400, oy: 400, width: 200, height: 100, color: 'red', type: 'color', id: '3', image: "url('https://www.tutorialspoint.com/images/seaborn-4.jpg?v=2')", z:3
      },
      {
        x: 800, ox: 800,
        y: 100, oy: 100,
        width: 200,
        height: 500,
        color: '',
        id: '4',
        image: 'https://www.tutorialspoint.com/images/seaborn-4.jpg?v=2',
        type: 'image',
        z:4
      }
    ];

    return cards;
  }
}
