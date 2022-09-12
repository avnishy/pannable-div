import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-zoom-controls',
  templateUrl: './zoom-controls.component.html',
  styleUrls: ['./zoom-controls.component.scss']
})
export class ZoomControlsComponent {
  @Output() zoomTo = new EventEmitter<number>();
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();

  @Input() zoomLevel: number = 1;

  public levels = [0.05, 0.5, 1, 1.5, 2, 4];
  public showLevels = false;

  public handleLevelDisplay(): void {
    this.showLevels = !this.showLevels;
  }

  public handleZoomTo(level: number): void {
    this.zoomTo.emit(level);
    this.showLevels = false;
  }

  public handleZoomInput(e: any): void {
    const input = (e?.target?.value ?? 100) / 100;
    this.handleZoomTo(input)
  }
}
