import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SvComponent } from './sv/sv.component';
import { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';
import { PdfPageComponent } from './pdf-page/pdf-page.component';

@NgModule({
  declarations: [
    AppComponent,
    SvComponent,
    PdfViewerComponent,
    PdfPageComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
