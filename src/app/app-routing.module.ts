import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SvComponent } from './sv/sv.component';

const routes: Routes = [{
  path: 'sv', component: SvComponent
}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
