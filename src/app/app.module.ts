import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SatPopoverModule } from '@ncstate/sat-popover';
import { HttpClientModule } from '@angular/common/http';
// import { LazyLoadImageModule, intersectionObserverPreset } from 'ng-lazyload-image';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SvComponent } from './sv/sv.component';
import { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';
import { PdfPageComponent } from './pdf-page/pdf-page.component';
import { PdfContentComponent } from './pdf-content/pdf-content.component';
import { SignatureComponent } from './signature/signature.component';

// add loaded flag to the img tag's parent
// intersectionObserverPreset.finally =  ({element}) => {
//   console.log(element);
// };

@NgModule({
  declarations: [
    AppComponent,
    SvComponent,
    PdfViewerComponent,
    PdfPageComponent,
    PdfContentComponent,
    SignatureComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    SatPopoverModule,
    HttpClientModule,
    DragDropModule
    // LazyLoadImageModule.forRoot({
    //   preset: intersectionObserverPreset,
    // })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
