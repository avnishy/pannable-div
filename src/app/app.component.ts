import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { Card } from './models/card';
import { Boundary } from './models/boundary';
import { Point } from './models/point';
import { CardService } from './services/card.service';
import { interval, Observable, of, Subscription } from 'rxjs';

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
  private previousScale = 1;
  private scaleInterval = 0.1; // 10 % of scale value
  public isCardPanning = false; // is window being panned from a card

  public panSpeed = -4; //how fast it pans
  public panSpeedPositive = 4; //how fast it pans
  public panRangeL = 20 //how close to edge to start panning (lower closer) lEFT TOP
  public panRangeR = 40 //how close to edge to start panning (lower closer) RIGHT BOTTOM
  src = interval(10);
  obs!: Subscription;
  panTrigger!: boolean;
  outsideOfViewPort = false;
  public innerHeightScaled = 0;
  public innerWidthScaled = 0;

  private midX = window.innerWidth / 2;
  private midY = window.innerHeight / 2;
  private mousePosition: { x: number, y: number } = { x: 0, y: 0 };

  // public translate = { scale: this.scale, translateX: 0, translateY: 0 };
  // private initialContentsPos = { x: 0, y: 0 };
  // private initialZoomPos = { x: 0, y: 0 };
  // private pinnedMousePosition = { x: 0, y: 0 };
  // mousePosition = { x: 0, y: 0 };

  private mouseClick!: { x: number, y: number, left: number, top: number }; //mouseClick position in viewport
  private mouse!: { x: number, y: number }; //mouse position of viewport
  private mousePage!: { x: number, y: number }; //mouse position relevant to whole document (including scroll)
  private mouseClickPage!: { x: number, y: number, left: number, top: number }; //mouseClick relevant to whole document (including scroll)
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

  //TODO update to getboundaryclientwidth / height for top bottom
  boundary: Boundary = { top: 0, bottom: 10000, left: 0, right: 10000 }

  pannedAmountXY = { pannedX: 0, pannedY: 0 }

  ngOnInit() {
    this.innerWidthScaled = window.innerWidth / this.scale;
    this.innerHeightScaled = window.innerHeight / this.scale;
    // set to pan then depending on where mouse is subscribe to the observable and track how long its held down for (calling the function)
    this.panTrigger = false;
    this.obs = this.src.subscribe(value => {

      if (this.panTrigger === true) {
        if (!this.canMove()) {
          return;
        }

        if (this.mouse.x < this.panRangeL && this.mouse.y > this.panRangeL && this.mouse.y < this.innerHeightScaled - this.panRangeR && window.scrollX != 0) {
          // console.log('left')
          this.scrollXBox(this.panSpeed);
          this.scrollPage(this.panSpeed, 0);
        } else if (this.mouse.y < this.panRangeL && this.mouse.x > this.panRangeL && this.mouse.x < this.innerWidthScaled - this.panRangeR && window.scrollY != 0) {
          // console.log(' up')
          this.scrollYBox(this.panSpeed);
          this.scrollPage(0, this.panSpeed);
        } else if (this.mouse.y < this.panRangeL && this.mouse.x > this.panRangeL && this.mouse.x > this.innerWidthScaled - this.panRangeR && window.scrollY != 0) {
          // console.log('up right')
          this.scrollXBox(this.panSpeedPositive);
          this.scrollYBox(this.panSpeed);
          this.scrollPage(this.panSpeedPositive, this.panSpeed);
        } else if (this.mouse.x < this.panRangeL && this.mouse.y < this.panRangeL && window.scrollX != 0 && window.scrollY != 0) {
          // console.log('up left')
          this.scrollXBox(this.panSpeed);
          this.scrollYBox(this.panSpeed);
          this.scrollPage(this.panSpeed, this.panSpeed);
        } else if (this.mouse.x > this.innerWidthScaled - this.panRangeR && this.mouse.y < this.innerHeightScaled - this.panRangeR && this.mouse.y > this.panRangeL) {
          // console.log('right');
          this.scrollXBox(this.panSpeedPositive);
          this.scrollPage(this.panSpeedPositive, 0);
        } else if (this.mouse.x < this.innerWidthScaled - this.panRangeR && this.mouse.x > this.panRangeL && this.mouse.y > this.innerHeightScaled - this.panRangeR) {
          // console.log('down');
          this.scrollYBox(this.panSpeedPositive);
          this.scrollPage(0, this.panSpeedPositive);
        } else if (this.mouse.x < this.panRangeL && this.mouse.y > this.innerHeightScaled - this.panRangeR && window.scrollX > 0) {
          this.scrollYBox(this.panSpeedPositive);
          this.scrollXBox(this.panSpeed);
          this.scrollPage(this.panSpeed, this.panSpeedPositive);
        } else if (this.mouse.x > this.innerWidthScaled - this.panRangeR && this.mouse.y > this.innerHeightScaled - this.panRangeR) {
          // console.log('down right')
          this.scrollXBox(this.panSpeedPositive);
          this.scrollYBox(this.panSpeedPositive);
          this.scrollPage(this.panSpeedPositive, this.panSpeedPositive);
        }
      }
    });
  }

  ngOnDestroy() {
    this.obs.unsubscribe();
  }

  public togglePanMode(): void {
    this.panningEnabled = !this.panningEnabled;
  }

  public handleMousedown(event: MouseEvent): void {
    // prevent conflicting behaviour when mousewheel is pressed  
    if (event.button === 1) {
      return;
    }

    this.innerWidthScaled = window.innerWidth * (1 / this.scale);
    this.innerHeightScaled = window.innerHeight * (1 / this.scale);
    this.prevMouse = { x: event.pageX, y: event.pageY };

    const x = event.clientX * this.scale;
    const y = event.clientY / this.scale;
    const xP = event.pageX / this.scale;
    const yP = event.pageY / this.scale;

    this.mouseClick = {
      x: event.clientX, y: event.clientY,
      left: this.selectionBox.x, top: this.selectionBox.y
    };

    this.mouseClickPage = {
      x: event.pageX, y: event.pageY,
      left: this.selectionBox.x, top: this.selectionBox.y
    };

    //TODO: add mousepage

    //TODO remove scrollX & Y and add page
    if (
      ((xP) > this.selectionBox.x && ((xP) < (this.selectionBox.x + this.selectionBox.width))) &&
      ((yP) > this.selectionBox.y && ((yP) < (this.selectionBox.y + this.selectionBox.height)))
    ) {
      this.cards.forEach((c) => {
        c.selected = this.selection.some(sc => sc.id === c.id);
      });
      this.status = Status.MOVE;
      this.panTrigger = true;
    } else if (this.panningEnabled) {
      // this.mouseClick.x = event.clientX; TODO remove not needed
      // this.mouseClick.y = event.clientY; TODO remove not needed
      this.isPanning = true;
      this.status = Status.OFF;
    } else {
      this.isSelecting = true;
      this.status = Status.OFF;
      this.panTrigger = false;
    }

    if (this.status !== Status.MOVE) {
      this.clearSelection();
    }
  }

  public clearSelection(): void {
    this.selection.length = 0;
    this.selectionBox = { x: 0, y: 0, width: 0, height: 0 };
  }

  public selectCard(card: Card): void {
    this.selection = [card];
    this.adjustSelectionBoxAferSelection();
  }

  private canMove(x?: number, y?: number): boolean {
    x = x ?? this.selectionBox.x;
    y = y ?? this.selectionBox.y;

    const grid = document.querySelector('.grid')?.getBoundingClientRect();
    const canvasWidth = grid?.width ?? 0;
    const canvasHeight = grid?.height ?? 0;

    if (
      (this.selectionBox.width + x + 100) > canvasWidth / this.scale ||
      x < 0 ||
      (this.selectionBox.height + y + 100) > canvasHeight / this.scale ||
      y < 0) {
      return false;
    }

    return true;

  }

  public handleMousemove(event: MouseEvent): void {
    this.mouse = { //should be / by scale
      x: event.clientX / this.scale,
      y: event.clientY / this.scale
    };

    //TODO: add mosue page on mouse move
    this.mousePage = {
      x: event.pageX,
      y: event.pageY
    };

    this.panRangeL = 40 / this.scale;
    this.panRangeR = 40 / this.scale;

    // if (this.selection.length && this.status === Status.MOVE && this.isCardPanning == false) {
    if (this.selection.length && this.status === Status.MOVE) {
      const xChange = ((this.mousePage.x - this.mouseClickPage.x) / this.scale);
      const yChange = ((this.mousePage.y - this.mouseClickPage.y) / this.scale);
      const x = this.mouseClickPage.left + xChange;
      const y = this.mouseClickPage.top + yChange;
      
      if (!this.canMove(x, y)) {
        return;
      }

      //Updating it to be the amount that the card has moved (scaled)
      this.selectionBox.x = x;
      this.selectionBox.y = y;

      this.selection.forEach((c) => {
        c.x = c.ox + xChange;
        c.y = c.oy + yChange;
      });

    } else if (this.isPanning) {

      // re-assigned while panning to avoid ui flickering due to transalate values 
      this.mousePage = {
        x: event.pageX,
        y: event.pageY
      };

      //calculate the difference its moved
      const diffXPan = -1 * (this.mousePage.x - this.prevMouse.x);
      const diffYPan = -1 * (this.mousePage.y - this.prevMouse.y);
      this.scrollPage(diffXPan, diffYPan);
      // this.prevMouse.x = this.mousePage.x;
      // this.prevMouse.y = this.mousePage.y; //update previous x & y values
      this.update();
    } else if (!this.panningEnabled && this.isSelecting) {
      this.drawSelectionBox();
    }
  }

  public handleMouseup(event: MouseEvent) {
    this.status = Status.OFF;
    this.isPanning = false;
    this.isSelecting = false;
    this.panTrigger = false; //set pan to false;

    // to prevent cards selection while dragging
    if (this.selection.length) {
      this.selection.forEach((c) => c.ox = c.x);
      this.selection.forEach((c) => c.oy = c.y);
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

    this.adjustSelectionBoxAferSelection();
  };

  // TODO: combine into one function by entering a negative or positve value
  public handleZoomOut(scaleInterval: number = this.scaleInterval, scrollToCenter: boolean = true): void {
    if (!this.isValidScale(this.scale - scaleInterval)) {
      return;
    }

    this.previousScale = this.scale;
    this.scale -= scaleInterval;
    this.canvasHeight = this.originalCanvasHeight * this.scale; //make smaller
    this.canvasWidth = this.originalCanvasWidth * this.scale;
    this.update();
    this.setScrollPosition(scrollToCenter);
  }

  // TODO: combine into one function by entering a negative or positve value
  public handleZoomIn(scaleInterval: number = this.scaleInterval, scrollToCenter: boolean = true): void {

    if (!this.isValidScale(this.scale + scaleInterval)) {
      return;
    }

    this.previousScale = this.scale;
    this.scale += scaleInterval;
    this.canvasHeight = this.originalCanvasHeight * this.scale; //make bigger
    this.canvasWidth = this.originalCanvasWidth * this.scale;
    this.update();
    this.setScrollPosition(scrollToCenter);
  };

  public handleZoomTo(scale: number): void {
    if (!this.isValidScale(scale)) {
      return;
    }

    this.previousScale = this.scale;
    this.scale = scale;
    this.canvasHeight = this.originalCanvasHeight * this.scale;
    this.canvasWidth = this.originalCanvasWidth * this.scale;
    this.update();
    this.setScrollPosition();
  }

  @HostListener('body:mouseleave', ['$event'])
  ommouseout(event: any) {
    if (this.panTrigger == true) {
      this.outsideOfViewPort = false;
    }
  }

  @HostListener('body:mouseenter', ['$event'])
  ommouseenter(event: any) {
    this.outsideOfViewPort = false;
  }

  @HostListener("wheel", ["$event"])
  public onScroll(event: WheelEvent) {
    // ctrlKey modifier is added when pinch gesture is performed on trackpad
    // need to validate if this works on mac
    //* TODO: Zoom around point can be optimized
    const ctrlKeyPressed = event.ctrlKey || event.metaKey;

    if (!ctrlKeyPressed) {
      return;
    }


    this.mousePosition = {
      x: event.pageX,
      y: event.pageY
    }

    const scale = 0.05;
    if (event.deltaY > 0) {
      this.handleZoomOut(scale, false);
    } else {
      this.handleZoomIn(scale, false);
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
    } else if ((event.key === '-' || event.which === minus) && (event.ctrlKey || event.metaKey)) {
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
  private drawSelectionBox(): void { //SCALING MOUSE POINTS, should probably set these earlier?
    const left = this.mousePage.x > this.mouseClickPage.x ? this.mouseClickPage.x / this.scale : this.mousePage.x / this.scale;
    const top = this.mousePage.y > this.mouseClickPage.y ? this.mouseClickPage.y / this.scale : this.mousePage.y / this.scale;
    this.selectionBox = {
      width: Math.abs((this.mousePage.x - this.mouseClickPage.x) / this.scale),
      height: Math.abs((this.mousePage.y - this.mouseClickPage.y) / this.scale),
      x: left,
      y: top
    };
  }

  /**
   * adjust selection box properties once the selection is complete
   * @returns void
   */
  private adjustSelectionBoxAferSelection(): void {
    const padding = 10;
    const minx = Math.min(...this.selection.map(c => c.x)) - padding;
    const maxx = Math.max(...this.selection.map(c => c.x + c.width)) + padding;

    const miny = Math.min(...this.selection.map(c => c.y)) - padding;
    const maxy = Math.max(...this.selection.map(c => c.y + c.height)) + padding;

    this.selectionBox = {
      width: (maxx - minx),
      height: (maxy - miny),
      x: minx,
      y: miny
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

  public updateCanvasWidth(amount: number) {
    this.canvasWidth = this.canvasWidth += amount;
  }

  public updateCanvasHeight(amount: number) {
    this.canvasHeight = this.canvasHeight += amount;
  }

  public scrollPage(xamount: number, yamount: number) {
    window.scrollBy(xamount, yamount);
  }

  // public scrollPage(xamount: number, yamount: number) {
  //   window.scrollBy(xamount, yamount);
  //   // if (this.selection.length && this.status === Status.MOVE && this.cardPanning == false) {

  //   //   this.selectionBox.x = this.mouseClick.left + (this.mouse.x - this.mouseClick.x);
  //   //   this.selectionBox.y = this.mouseClick.top + (this.mouse.y - this.mouseClick.y);
  //   // } else 
  //   // if (this.selection.length && this.status === Status.MOVE && this.cardPanning == true) {
  //   //   //Pan from the card
  //   //   // this.selectionBox.x = this.selectionBox.x + (1 * (1 / this.scale));
  //   //   // this.selectionBox.y = this.selectionBox.y + (this.panSpeedPositive * (1 /this.scale));
  //   // }
  // }

  scrollXBox(panSpeed: number) {
    this.selectionBox.x = this.selectionBox.x + panSpeed * (1 / this.scale);
    // this.selectionBox.x = this.selectionBox.x + ((panSpeed * (1 /this.scale)) / this.numberOfCardsSelected);
    // this.selectionBoxChange.emit(this.selectionBox);
    // this.mouseClick.left = this.mouseClick.left + panSpeed * (1 / this.scale);
    // this.boxPosition2.left = this.boxPosition2.left + panSpeed * (1 /this.scale);

    this.selection.forEach(c => {
      c.x += panSpeed * (1 / this.scale);
      // c.ox += panSpeed * (1 / this.scale);
    });
  }

  scrollYBox(panSpeed: number) {
    this.selectionBox.y = this.selectionBox.y + panSpeed * (1 / this.scale);
    // this.selectionBox.y = this.selectionBox.y + ((panSpeed * (1 /this.scale)) / this.numberOfCardsSelected);
    // this.selectionBoxChange.emit(this.selectionBox);
    // this.mouseClick.top = this.mouseClick.top + panSpeed * (1 / this.scale);
    // this.boxPosition2.top = this.boxPosition2.top + panSpeed * (1 /this.scale);

    this.selection.forEach(c => {
      c.y += panSpeed * (1 / this.scale);
      // c.oy += panSpeed * (1 / this.scale);
    });
  }

  public scrollTo(xamount: number, yamount: number) {
    window.scrollTo(xamount, yamount);
  }


  /**
   * 
   * @param scrollToCenter - when set to true it will zoom into center of page else to the current mouse position
   * @returns void
   */
  private setScrollPosition(scrollToCenter: boolean = true): void {
    const scrollPosition: { x: number, y: number } = { x: 0, y: 0 };

    if (scrollToCenter) {
      scrollPosition.x = this.midX + (window.scrollX);
      scrollPosition.y = this.midY + (window.scrollY);
    } else {
      scrollPosition.x = this.mousePosition.x;
      scrollPosition.y = this.mousePosition.y;
    }

    const zoomPoint = { x: scrollPosition.x / this.previousScale, y: scrollPosition.y / this.previousScale };
    const zoomPointNew = {
      x: (zoomPoint.x) * this.scale,
      y: (zoomPoint.y) * this.scale,
    };

    const newScroll = {
      x: zoomPointNew.x - scrollPosition.x,
      y: zoomPointNew.y - scrollPosition.y
    };

    //* Scroll window by that amount
    window.scrollBy(newScroll.x, newScroll.y);
  }

  private isValidScale(scale: number): boolean {
    return !(scale < 0.099 || scale > 4);
  }

}
