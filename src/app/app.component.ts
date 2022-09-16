import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild
} from '@angular/core';
import { Card } from './models/card';
import { Point } from './models/point';
import { CardService } from './services/card.service';

const enum Status {
  OFF = 0,
  MOVE = 2,
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('contents') contents!: ElementRef;

  public panningEnabled = false;
  private isPanning = false;
  private isSelecting = false;
  public scale = 1;
  private scaleInterval = 0.1; // 10 % of scale value

  // public translate = { scale: this.scale, translateX: 0, translateY: 0 };
  // private initialContentsPos = { x: 0, y: 0 };
  // private initialZoomPos = { x: 0, y: 0 };
  // private pinnedMousePosition = { x: 0, y: 0 };
  // mousePosition = { x: 0, y: 0 };

  private mouseClick!: { x: number, y: number, left: number, top: number };
  private mouse!: { x: number, y: number };
  private status: Status = Status.OFF;

  public selection: Card[] = [];
  public selectionBox: { width: number, height: number, x: number, y: number } = { width: 0, height: 0, x: 0, y: 0 }

  public cards: Card[] = this.cardService.getCards();

  private originalCanvasHeight = 2000;
  private originalCanvasWidth = 2000;
  public canvasHeight = 2000;
  public canvasWidth = 2000;

  public prevMouse = { x: 0, y: 0 };

  constructor(private cardService: CardService) { }

  ngOnInit() { }

  public togglePanMode(): void {
    this.panningEnabled = !this.panningEnabled;
  }

  public handleMousedown(event: MouseEvent): void {
    this.prevMouse = { x: event.clientX, y: event.clientY };
    // this.initialContentsPos.x = this.translate.translateX;
    // this.initialContentsPos.y = this.translate.translateY;
    
    const x = event.clientX * (1 / this.scale);
    const y = event.clientY * (1 / this.scale);

    this.mouseClick = {
      x: x,
      y: y,
      left: this.selectionBox.x,
      top: this.selectionBox.y
    };


    if (
      ((x + window.scrollX) > this.selectionBox.x && ((x + window.scrollX) < (this.selectionBox.x + this.selectionBox.width))) &&
      ((y + window.scrollY) > this.selectionBox.y && ((y + window.scrollY) < (this.selectionBox.y + this.selectionBox.height)))
    ) {
      this.cards.forEach((c) => {
        c.selected = this.selection.some(sc => sc.id === c.id);
      });
      this.status = Status.MOVE;
    } else if (this.panningEnabled) {
      this.mouseClick.x = event.clientX;
      this.mouseClick.y = event.clientY;
      this.isPanning = true;
      this.status = Status.OFF;
    } else {
      this.isSelecting = true;
      this.status = Status.OFF;
    }

    if (this.status !== Status.MOVE) {
      this.clearSelection();
    }
  }

  public clearSelection(): void {
    this.selection.length = 0;
    this.selectionBox = { x: 0, y: 0, width: 0, height: 0 };
  }

  public handleMousemove(event: MouseEvent): void {
    this.mouse = {
      x: event.clientX * (1 / this.scale),
      y: event.clientY * (1 / this.scale)
    };


    if (this.selection.length && this.status === Status.MOVE) {
      this.selectionBox.x = this.mouseClick.left + (this.mouse.x - this.mouseClick.x);
      this.selectionBox.y = this.mouseClick.top + (this.mouse.y - this.mouseClick.y);
    } else if (this.isPanning) {

      // re-assigned while panning to avoid ui flickering due to transalate values 
      this.mouse = {
        x: event.clientX,
        y: event.clientY
      };

      //calculate the difference its moved
      const diffXPan = -1 * (this.mouse.x - this.prevMouse.x);
      const diffYPan = -1 * (this.mouse.y - this.prevMouse.y);
      this.scrollPage(diffXPan, diffYPan); //scroll page by the difference 
      this.prevMouse.x = this.mouse.x;
      this.prevMouse.y = this.mouse.y; //update previous x & y values
      this.update();
    } else if (!this.panningEnabled && this.isSelecting) {
      this.drawSelectionBox();
    }
  }

  public handleMouseup(event: MouseEvent) {
    this.status = Status.OFF;
    this.isPanning = false;
    this.isSelecting = false;

    // to prevent cards selection while dragging
    if (this.selection.length) {
      return;
    }

    const sbox = this.selectionBox;
    const l1: Point = { x: sbox.x, y: sbox.y };
    const r1: Point = { x: (sbox.x + sbox.width), y: (sbox.y + sbox.height) };

    this.selection = this.cards.filter((c) => {
      const l2: Point = { x: c.x, y: c.y };
      const r2: Point = { x: (c.x + c.width), y: (c.y + c.height) };

      return this.doOverlap(l1, r1, l2, r2);
    });

    if (!this.selection.length) {
      this.clearSelection();
      return;
    }

    const padding = 10;
    const newMinX = Math.min(...this.selection.map(c => c.x)) - padding;
    const newMaxX = Math.max(...this.selection.map(c => c.x + c.width)) + padding;

    const newMinY = Math.min(...this.selection.map(c => c.y)) - padding;
    const newMaxY = Math.max(...this.selection.map(c => c.y + c.height)) + padding;

    this.selectionBox = {
      width: (newMaxX - newMinX),
      height: (newMaxY - newMinY),
      x: newMinX,
      y: newMinY
    };
  };


  public handleZoomOut(scaleInterval: number = this.scaleInterval): void {
    if (this.scale - scaleInterval < .05) {
      return;
    }

    this.scale -= scaleInterval;
    this.canvasHeight = this.originalCanvasHeight * this.scale; //make smaller
    this.canvasWidth = this.originalCanvasWidth * this.scale;
  }

  public handleZoomIn(scaleInterval: number = this.scaleInterval): void {
    if (this.scale + scaleInterval > 4) {
      return;
    }

    this.scale += scaleInterval;
    this.canvasHeight = this.originalCanvasHeight * this.scale; //make bigger
    this.canvasWidth = this.originalCanvasWidth * this.scale;
    this.update();
  };

  public handleZoomTo(scale: number): void {
    this.scale = scale;
    this.canvasHeight = this.originalCanvasHeight * this.scale; 
    this.canvasWidth = this.originalCanvasWidth * this.scale;
    this.update();
    
  }

  @HostListener("wheel", ["$event"])
  public onScroll(event: WheelEvent) {
    // ctrlKey modifier is added when pinch gesture is performed on trackpad
    // need to validate if this works on mac
    const ctrlKeyPressed = event.ctrlKey || event.metaKey;

    if (!ctrlKeyPressed) {
      return;
    }

    const scale = 0.05;
    if (event.deltaY > 0) {
      this.handleZoomOut(scale);
    } else {
      this.handleZoomIn(scale);
    }

    event.preventDefault();
  }

  @HostListener('window:keyup ', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') {
      event.preventDefault();
      this.panningEnabled = false;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const minus = 189;
    const plus = 187;

    if (event.code === 'Space' && event.target == document.body) {
      this.panningEnabled = true;
      event.preventDefault()
    }else if ((event.key === '-' || event.which === minus) && (event.ctrlKey || event.metaKey)) {
      this.handleZoomOut();
      event.preventDefault();
    } else if ((event.key === '+' || event.which === plus) && (event.ctrlKey || event.metaKey)) {
      this.handleZoomIn();
      event.preventDefault();
    }
  }

  private update(): void {
    const matrix = `matrix(${this.scale},0,0,${this.scale},0,0)`;
    this.contents.nativeElement.style.transform = matrix;
  };

  /**
   * set the height, width, top and left attributes for selection box
   * @returns void
   */
  private drawSelectionBox(): void {
    const left = this.mouse.x > this.mouseClick.x ? this.mouseClick.x : this.mouse.x;
    const top = this.mouse.y > this.mouseClick.y ? this.mouseClick.y : this.mouse.y;
    this.selectionBox = {
      width: Math.abs(this.mouse.x - this.mouseClick.x),
      height: Math.abs(this.mouse.y - this.mouseClick.y),
      x: left + window.scrollX,
      y: top + window.scrollY
    };
  }


  /**
   * 
   * @param l1 - top left co-oridinates for selection box
   * @param r1 - bottom right co-oridinates for selection box
   * @param l2 - top left co-oridinates for card
   * @param r2 - bottom right co-oridinates for card
   * @returns true if given two rectangles overlap each other 
   */
  private doOverlap(l1: Point, r1: Point, l2: Point, r2: Point): boolean {
    // If one rectangle is on left side of other
    if (l2.x > r1.x || l1.x > r2.x) {
      return false;
    }

    // If one rectangle is above other
    if (l2.y > r1.y || l1.y > r2.y) {
      return false;
    }

    return true;
  }

  sendToBack(indexToUpdate: number) {
    this.cards.forEach((element, index) => {
      if (element.z === indexToUpdate) {
        this.cards.splice(index, 1);
        this.cards.unshift(element);
      }
    });
  }

  //Appends to the back of the array so its rendered last
  bringToFront(indexToUpdate: number) {
    this.cards.forEach((element, index) => {
      if (element.z === indexToUpdate) {
        this.cards.splice(index, 1);
        this.cards.push(element);
      }
    });
  }

  panFromCard() {
    this.update();
  }

  public updateCanvasWidth(amount: number) {
    this.canvasWidth = this.canvasWidth += amount;
  }

  public updateCanvasHeight(amount: number) {
    this.canvasHeight = this.canvasHeight += amount;
  }

  public scrollPage(xamount: number, yamount: number) {
    window.scrollBy(xamount, yamount);
  }

}
