import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Result} from '../_resp/Result';
import {Observable} from 'rxjs';
import {StampList} from '../_resp/StampList';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StampService {

  constructor(private http: HttpClient) { }

  getStamps(userId: string): Observable<Result<StampList>> {
    // use post in test env
    // return this.http.post<Result<StampList>>(environment.apis.getStampList, {userId}, {
    //   headers: new HttpHeaders({'Content-Type':  'application/json'}),
    //   responseType: 'json'
    // });

    // this is only for mocking test
    // use post instead of get
    return this.http.get<Result<StampList>>(environment.apis.getStampList);
  }
}
