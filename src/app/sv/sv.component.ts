import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-sv',
  templateUrl: './sv.component.html',
  styleUrls: ['./sv.component.scss']
})
export class SvComponent implements OnInit {

  str: string;

  constructor() { }

  ngOnInit() {
    this.str = 'Louis';
  }

}
