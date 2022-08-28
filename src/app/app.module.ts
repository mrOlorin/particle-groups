import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatCardModule} from "@angular/material/card";
import {MatButtonModule} from "@angular/material/button";
import {MatRippleModule} from "@angular/material/core";
import {MatIconModule} from "@angular/material/icon";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {ReactiveFormsModule} from "@angular/forms";
import {MatChipsModule} from "@angular/material/chips";
import {MatListModule} from "@angular/material/list";
import {MatGridListModule} from "@angular/material/grid-list";
import {MatSliderModule} from "@angular/material/slider";
import {DragDropModule} from "@angular/cdk/drag-drop";
import {MatTooltipModule} from "@angular/material/tooltip";
import {OverlayModule} from "@angular/cdk/overlay";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {StatsComponent} from './stats/stats.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    StatsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatCardModule,
    MatButtonModule,
    MatRippleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatListModule,
    MatGridListModule,
    MatSliderModule,
    DragDropModule,
    MatTooltipModule,
    OverlayModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
