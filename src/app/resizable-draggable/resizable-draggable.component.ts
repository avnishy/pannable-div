import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, HostListener, OnChanges, OnDestroy, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Card } from '../models/card';
import { interval, Observable, of, Subscription } from 'rxjs';

const enum Status {
  OFF = 0,
  RESIZE = 1, //Resize Bottom right
  MOVE = 2,
  RESIZETOPLEFT = 3, //Resize top left
  RESIZETOPRIGHT = 4, //Resize top reft
  RESIZEBOTTOMLEFT = 5, // Resize bottom left
  RESIZETOP = 31, //Resize top left
  RESIZERIGHT = 32, //Resize top right
  RESIZEBOTTOM = 33, //Resize top reft
  RESIZELEFT = 34 // Resize bottom left
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
  @Input() public translate!: { scale: number, translateX: number, translateY: number }; //TODO REMOVE UNEEDED
  @Output() public translateChange = new EventEmitter<{scale: number, translateX: number, translateY: number}>(); //TODO REMOVE
  @Output() public updatePan = new EventEmitter<void>();

  @Output() public scrollDistance = new EventEmitter<{scrollX: number, scrollY: number}>;

  @Output() public clearSelection = new EventEmitter<void>();

  @ViewChild("box") public box!: ElementRef;

  private boxPosition!: { left: number, top: number };
  private containerPos!: { left: number, top: number, right: number, bottom: number };
  public mouse!: { x: number, y: number }
  public status: Status = Status.OFF;
  private mouseClick!: { x: number, y: number, left: number, top: number }
  private cardTestImage = "url('https://www.tutorialspoint.com/images/seaborn-4.jpg?v=2')"

  private boxPosition2!: { left: number, top: number, width: number, height: number, right: number, bottom: number };
  private minSize = 20;

  subscription!: Subscription; //subscription to subscribe to the timer
  public panSpeed = -2; //how fast it pans
  public panSpeedPositive = 2; //how fast it pans
  private panRangeL = 20 //how close to edge to start panning (lower closer) lEFT TOP
  private panRangeR = 40 //how close to edge to start panning (lower closer) RIGHT BOTTOM

  src = interval(10);
  obs!: Subscription;
  panTrigger!: boolean;
  public innerHeightScaled = 0;
  public innerWidthScaled = 0;

  ngOnInit() { 
    // set to pan then depending on where mouse is subscribe to the observable and track how long its held down for (calling the function)
    this.panTrigger = false;

  }

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
  
  ngOnDestroy() {
    this.obs.unsubscribe();
  }

  private loadBox() {
    const { left, top, right, bottom, width, height } = this.box.nativeElement.getBoundingClientRect();
    this.boxPosition = this.box.nativeElement.getBoundingClientRect();
    // this.boxPosition2 = { left: left, top: top, right: right, bottom: bottom , width: width, height: height } //TODO: combine these two into one line
  }

  private loadContainer() {
    const left = this.boxPosition.left - this.card.x;
    const top = this.boxPosition.top - this.card.y;
    const right = left + 5000;
    const bottom = top + 5000;
    this.containerPos = { left, top, right, bottom };
  }

  public setStatus(event: MouseEvent, status: number): void {
    if (status === 1 || status === 3 || status === 4 || status === 5 || status === 31 || status === 32 || status === 33 || status === 34) {
      this.mouseClick = { x: event.clientX * (1 / this.scale), y: event.clientY * (1 / this.scale), left: this.card.x, top: this.card.y };
      this.clearSelection.emit();
      event.stopPropagation(); // Stops it from moving onto the drag to move event
    } else if (status === 2) {
      this.mouseClick = { x: event.clientX * (1 / this.scale), y: event.clientY * (1 / this.scale), left: this.card.x, top: this.card.y };
      this.innerWidthScaled = window.innerWidth * (1 / this.scale);
      this.innerHeightScaled = window.innerHeight * (1 / this.scale);
      this.clearSelection.emit();
      event.stopPropagation();
    } else {
      this.loadBox();
      this.card.selected = false;
      this.panTrigger = false;
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

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouse = { x: event.clientX * (1 / this.scale), y: event.clientY * (1 / this.scale) };
    this.boxPosition2 = this.box.nativeElement.getBoundingClientRect();
    this.boxPosition2 = { left: this.boxPosition2.left / this.scale , top: this.boxPosition2.top * (1 / this.scale), right: this.boxPosition2.right * (1 / this.scale), bottom: this.boxPosition2.bottom * (1 / this.scale), width: this.boxPosition2.width * (1 / this.scale), height: this.boxPosition2.height * (1 / this.scale) }
    if (this.status === Status.RESIZETOP) this.resizeTop();
    else if (this.status === Status.RESIZERIGHT) this.resizeRight();
    else if (this.status === Status.RESIZEBOTTOM) this.resizeBottom();
    else if (this.status === Status.RESIZELEFT) this.resizeLeft();
    else if (this.status === Status.MOVE) {
      this.move();
    }
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

  //TODO: Temporarily disbled boundary controls (re-enable later) resizing with boundary controls.ts in Docs

  resizeRight(): void {
    // if(this.mouse.x + window.scrollX < this.boundaryScaled.right) {
      const width = this.mouse.x - (this.boxPosition2.left);
      const scaleUp = width / this.boxPosition2.width;
      const height = this.boxPosition2.height * scaleUp;
      // const boundHeight = height + this.boxPosition2.top;

      //check in boundary
      // if(boundHeight < this.boundaryScaled.bottom) {
        //check not too small
        if (width > this.minSize) {
          this.card.width = width;
          this.card.height = height;
        }
      // }
    // }
  }

  resizeLeft(): void {

      const width = this.boxPosition2.width + (this.boxPosition2.left - this.mouse.x);
      const scaleUp = width / this.boxPosition2.width;
      const height = this.boxPosition2.height * scaleUp;
  
      if (width > this.minSize) {
        this.card.width = width;
        this.card.height = height;
        this.card.x = this.mouse.x + (window.scrollX * (1/this.scale));
      }
  }

  resizeBottom(): void { //TODO: Update to correct type for nativeElement
      const height = this.mouse.y - this.boxPosition2.top;
      const scaleUp = height / this.boxPosition2.height;
      const width = this.boxPosition2.width * scaleUp;
  
      if (height > this.minSize) {
        this.card.width = width;
        this.card.height = height;
      }
  }

  resizeTop(): void { //TODO: Update to correct type for nativeElement
    
      const height = this.boxPosition2.height + (this.boxPosition2.top - this.mouse.y);
      const scaleUp = height / this.boxPosition2.height;
      const width = this.boxPosition2.width * scaleUp;
      
        if (height > this.minSize) {
          this.card.width = width;
          this.card.height = height;
          this.card.y = this.mouse.y + (window.scrollY * (1/this.scale));
        }
  }

  private resizeCondMeet() {
    return (this.mouse.x < this.containerPos.right && this.mouse.y < this.containerPos.bottom);
  }

  private move() {
    this.panTrigger = true; //allow board to be panned
    this.card.x = this.mouseClick.left + (this.mouse.x - this.mouseClick.x);
    this.card.y = this.mouseClick.top + (this.mouse.y - this.mouseClick.y);
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

  //Updates the translation on the parent (canvas) to reflect state of panned board
  //TODO unecessary can remove
  updateTranslation() {
    this.translateChange.emit({scale: this.translate.scale, translateX: this.translate.translateX, translateY: this.translate.translateY});
    this.updatePan.emit();
  }

  scrollCanvas(x: number, y:number) {
    this.scrollDistance.emit({scrollX: x, scrollY: y});
  }

  scrollX(panSpeed: number) {
    this.card.x = this.card.x + panSpeed * (1 /this.scale);
    this.mouseClick.left = this.mouseClick.left + panSpeed * (1 /this.scale);
    this.boxPosition2.left = this.boxPosition2.left + panSpeed * (1 /this.scale);
  }

    //Pans the canvas on the y axis while updating cards position and mouseclick for movement/resizing //negative number for up positive for down
  scrollY(panSpeed: number) {
    this.card.y = this.card.y + panSpeed * (1 /this.scale);
    this.mouseClick.top = this.mouseClick.top + panSpeed * (1 /this.scale);
    this.boxPosition2.top = this.boxPosition2.top + panSpeed * (1 /this.scale);
  }
  
}