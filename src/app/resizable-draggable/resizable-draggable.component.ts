import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, HostListener, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Card } from '../models/card';

const enum Status {
  OFF = 0,
  RESIZE = 1, //Resize Bottom right
  MOVE = 2,
  RESIZETOPLEFT = 3, //Resize top left
  RESIZETOPRIGHT = 4, //Resize top reft
  RESIZEBOTTOMLEFT = 5 // Resize bottom left
}

@Component({
  selector: 'app-resizable-draggable',
  templateUrl: './resizable-draggable.component.html',
  styleUrls: ['./resizable-draggable.component.scss']
})
export class ResizableDraggableComponent implements OnInit, AfterViewInit, OnChanges {
  // @Input() public width!: number;
  // @Input() public height!: number;
  // @Input() public left!: number;
  // @Input() public top!: number;
  // @Input() public type!: string;
  // @Input() public image!: string;
  // @Input() public color!: string;

  @Input() public scale: number = 1;
  @Input() public card!: Card;
  @Input() public selected?= false;
  @Input() public translate!: { scale: number, translateX: number, translateY: number };

  @Output() public clearSelection = new EventEmitter<void>();

  @ViewChild("box") public box!: ElementRef;

  private boxPosition!: { left: number, top: number };
  private containerPos!: { left: number, top: number, right: number, bottom: number };
  public mouse!: { x: number, y: number }
  public status: Status = Status.OFF;
  private mouseClick!: { x: number, y: number, left: number, top: number }
  private cardTestImage = "url('https://www.tutorialspoint.com/images/seaborn-4.jpg?v=2')"

  private boxPosition2!: { left: number, top: number, x: number, y: number, width: number, height: number, right: number, bottom: number };
  private minSize = 20;

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges): void {
    // added for multi-selection
    if (changes['selected']?.currentValue) {
      this.status = 2;
    }
  }

  ngAfterViewInit() {
    this.loadBox();
    this.loadContainer();
  }

  private loadBox() {
    const { left, top } = this.box.nativeElement.getBoundingClientRect();
    this.boxPosition = { left: left * (1 / this.scale), top: top * (1 / this.scale) };
    this.boxPosition2 = this.box.nativeElement.getBoundingClientRect(); //TODO: Add scale logic above into this
  }

  private loadContainer() {
    const left = this.boxPosition.left - this.card.x;
    const top = this.boxPosition.top - this.card.y;
    const right = left + 5000;
    const bottom = top + 5000;
    this.containerPos = { left, top, right, bottom };
  }

  public setStatus(event: MouseEvent, status: number): void {
    if (status === 1 || status === 3 || status === 4 || status === 5) {
      this.mouseClick = { x: event.clientX * (1 / this.scale), y: event.clientY * (1 / this.scale), left: this.card.x, top: this.card.y };
      this.clearSelection.emit();
      event.stopPropagation(); // Stops it from moving onto the drag to move event
    } else if (status === 2) {
      this.mouseClick = { x: event.clientX * (1 / this.scale), y: event.clientY * (1 / this.scale), left: this.card.x, top: this.card.y };
      this.clearSelection.emit();
      event.stopPropagation();
    } else {
      this.loadBox();
      this.card.selected = false;
    }

    this.status = status;
  }

  /**
   * 
   * This sets the mouseClick variable, 
   * need this to be set when multi-selected and dragging
   * should only executed incase of multi-selection
   */
  public setMouseClick(event: MouseEvent): void {
    if (!this.card.selected) {
      return;
    }

    this.mouseClick = { x: event.clientX * (1 / this.scale), y: event.clientY * (1 / this.scale), left: this.card.x, top: this.card.y };
  }

  // setStatus(event: MouseEvent, status: number) {
  //   if (status === 1) event.stopPropagation();
  //   } else if(status === 3|| status === 4 || status === 5) { //Resizing functions
  //     this.mouseClick = { x: event.clientX * (1 / this.scale), y: event.clientY * (1 / this.scale), left: this.left, top: this.top }; //TODO: Double check scaling
  //     event.stopPropagation(); // Stops it from moving onto the drag to move event
  //   } else if (status === 2) {
  //     this.mouseClick = { x: event.clientX * (1 / this.scale), y: event.clientY * (1 / this.scale), left: this.left, top: this.top };
  //   } else {
  //     this.loadBox();
  //   }
  //   this.status = status;
  // }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouse = { x: event.clientX * (1 / this.scale), y: event.clientY * (1 / this.scale) };

    if (this.status === Status.RESIZE) this.resize(); //TODO Rename 
    else if (this.status === Status.RESIZETOPLEFT) this.resizeTL();
    else if (this.status === Status.RESIZETOPRIGHT) this.resizeTR();
    else if (this.status === Status.RESIZEBOTTOMLEFT) this.resizeBL();
    else if (this.status === Status.MOVE) this.move();
  }

  private resizeTL() { //TODO: Implement logic to ensure its within boundaries wihtout moving it
    const width = this.boxPosition2.width - (this.mouse.x - this.mouseClick.x);
    const height = this.boxPosition2.height - (this.mouse.y - this.mouseClick.y);
    if (width > this.minSize) {
      const left = this.mouseClick.left + (this.mouse.x - this.mouseClick.x);
      this.card.width = width;
      this.card.x = left;
    }
    if (height > this.minSize) {
      const top = this.mouseClick.top + (this.mouse.y - this.mouseClick.y);
      this.card.height = height;
      this.card.y = top;
    }
  }

  private resizeTR() { //TODO: Implement logic to ensure its within boundaries wihtout moving it
    const width = this.boxPosition2.width + (this.mouse.x - this.mouseClick.x);
    const height = this.boxPosition2.height - (this.mouse.y - this.mouseClick.y);
    if (width > this.minSize) {
      this.card.width = width;
    }
    if (height > this.minSize) {
      const top = this.mouseClick.top + (this.mouse.y - this.mouseClick.y);
      this.card.height = height;
      this.card.y = top;
    }
  }
  private resizeBL() { //TODO: Implement logic to ensure its within boundaries wihtout moving it
    const width = this.boxPosition2.width - (this.mouse.x - this.mouseClick.x);
    const height = this.boxPosition2.height + (this.mouse.y - this.mouseClick.y);
    if (width > this.minSize) {
      const left = this.mouseClick.left + (this.mouse.x - this.mouseClick.x);
      this.card.width = width;
      this.card.x = left;
    }
    if (height > this.minSize) {
      this.card.height = height;
    }
  }

  private resize() { //TODO Label BR & Implement logic to ensure its within boundaries wihtout moving it
    const width = this.mouse.x - this.boxPosition.left;
    const height = this.mouse.y - this.boxPosition.top;
    if (width > this.minSize) {
      this.card.width = width;
    }
    if (height > this.minSize) {
      this.card.height = height;
    }
  }

  private resizeCondMeet() {
    return (this.mouse.x < this.containerPos.right && this.mouse.y < this.containerPos.bottom);
  }

  private move() {
    // if(this.moveCondMeet()){
    this.card.x = this.mouseClick.left + (this.mouse.x - this.mouseClick.x);
    this.card.y = this.mouseClick.top + (this.mouse.y - this.mouseClick.y);
    // }
  }

  private moveCondMeet() {
    const offsetLeft = this.mouseClick.x - this.boxPosition.left;
    const offsetRight = this.card.width - offsetLeft;
    const offsetTop = this.mouseClick.y - this.boxPosition.top;
    const offsetBottom = this.card.height - offsetTop;
    return (
      this.mouse.x > this.containerPos.left + offsetLeft &&
      this.mouse.x < this.containerPos.right - offsetRight &&
      this.mouse.y > this.containerPos.top + offsetTop &&
      this.mouse.y < this.containerPos.bottom - offsetBottom
    );
  }
}
