import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '../../shared/services/user.service';
import {  map } from 'rxjs/operators';
import { IUserinfo } from 'src/app/shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class KoriniciGuard implements CanActivate {
  constructor(private us: UserService) {}
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return this.chekUserAutority();
  }

  chekUserAutority(): Observable<boolean> {
    return this.us.$user.pipe(
      map((user: IUserinfo): boolean => {
      if (user !== null && user.userRole !== null && user.userRole === 5 ) {
        return true;
      } else { return false; } })
    );
  }
}