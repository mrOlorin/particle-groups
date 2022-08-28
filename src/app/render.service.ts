import {Injectable} from '@angular/core';
import {fromEvent, startWith, Subject, takeUntil} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class RenderService {

  public readonly canvas = document.createElement("canvas") as HTMLCanvasElement;

  private readonly destroy$ = new Subject<void>();

  constructor() {
    fromEvent(window, "resize").pipe(
      takeUntil(this.destroy$), startWith(2)
    ).subscribe(() => {
      this.canvas.width = innerWidth;
      this.canvas.height = innerHeight;
    });
    document.body.appendChild(this.canvas);
  }

}
