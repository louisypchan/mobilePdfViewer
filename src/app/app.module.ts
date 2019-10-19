import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
// import { LazyLoadImageModule, intersectionObserverPreset } from 'ng-lazyload-image';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SvComponent } from './sv/sv.component';
import { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';
import { PdfPageComponent } from './pdf-page/pdf-page.component';
import { PdfContentComponent } from './pdf-content/pdf-content.component';

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
    PdfContentComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    // LazyLoadImageModule.forRoot({
    //   preset: intersectionObserverPreset,
    // })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
