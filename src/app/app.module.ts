import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ImgixAngularModule } from '@imgix/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ResizableDraggableComponent } from './resizable-draggable/resizable-draggable.component';
import { ZoomControlsComponent } from './components/zoom-controls/zoom-controls.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    ResizableDraggableComponent,
    ZoomControlsComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    ImgixAngularModule.forRoot({
      domain: 'the-dot-imgix-test133.imgix.net',
      // This enables the auto format and compress imgix parameters by default for all images, which we recommend to reduce image size, but you might choose to turn this off.
      defaultImgixParams: {
        auto: 'format,compress',
      },
      /* Add more imgix config here, see the API section for a full list of options */
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
