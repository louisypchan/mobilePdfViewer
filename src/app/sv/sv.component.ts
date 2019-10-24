import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-sv',
  templateUrl: './sv.component.html',
  styleUrls: ['./sv.component.scss']
})
export class SvComponent implements OnInit {

  signatureType: number;
  isTop: boolean;
  isBottom: boolean;

  constructor(private route: ActivatedRoute) {
    //
  }

  ngOnInit() {
    this.signatureType = +(this.route.snapshot.queryParams.st || 1 );
    this.isTop = true;
    this.isBottom = false;
  }

}
