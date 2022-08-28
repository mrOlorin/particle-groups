import {ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnInit} from '@angular/core';
import {Group, ParticleGroup, RandomSettings, Stats} from "./ParticleGroup";
import * as seedrandom from "seedrandom";
import {Alea} from "seedrandom";
import {FormControl} from "@angular/forms";
import {BehaviorSubject, bufferCount, map, Observable, shareReplay, tap} from "rxjs";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {RenderService} from "./render.service";
import {parse, stringify} from "zipson";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('openClose', [
      state('open', style({transform: 'translateX(0)'})),
      state('closed', style({transform: 'translateX(-100%)'})),
      transition('* => *', [animate('.4s ease-in-out')]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {

  public readonly particleGroup = this.ngZone.runOutsideAngular(() =>
    new ParticleGroup(this.renderService.canvas.getContext("2d") as CanvasRenderingContext2D)
  );
  public readonly isOpen$ = new BehaviorSubject(localStorage.getItem("isOpen") === "true");
  public readonly stats$: Observable<Stats> = this.statsBuffered$(10).pipe(
    tap(() => this.cd.detectChanges()),
  );

  public constructor(public readonly renderService: RenderService,
                     private readonly cd: ChangeDetectorRef,
                     private readonly ngZone: NgZone) {
  }

  public readonly seedControl = new FormControl<string>("", {nonNullable: true});
  public readonly seedOptions: string[] = ["мхлол", "тисаф"];

  public readonly seed$: Observable<seedrandom.PRNG> = this.seedControl.valueChanges.pipe(
    map(seed => seedrandom.alea(seed)),
    shareReplay(1),
  );

  public ngOnInit() {
    this.isOpen$.subscribe(isOpen => localStorage.setItem("isOpen", "" + isOpen));

    this.seed$.subscribe(rng => {
      const params: RandomSettings = {
        particlesCount: 600,
        getGroupsCount: () => Math.round(1 + rng.double() * 6),
        groupParticlesCount: (max: number) => max,
        getRanges: (min: number) => {
          const rand = () => Math.round(min + rng.double() * 200);
          const ranges = this.particleGroup.groups.map(rand)
          ranges.push(rand());
          return ranges;
        },
        getSize: () => Math.round(4 + rng.double() * 10),
        getForces: () => {
          const forces = this.particleGroup.groups.map(() => rng.double() * 2 - 1);
          forces.push(rng.double() * 2 - 1);
          return forces;
        },
      };
      this.particleGroup.random(params);
      this.saveState();
    });

    this.restoreState();
    window.addEventListener("popstate", () => this.restoreState());
  }

  private saveState() {
    let state = stringify(this.particleGroup.groups);
    history.pushState(state, "jopa", encodeURIComponent(state));
    if (state.length > 1000) {
      const parsed = (parse(state) as typeof this.particleGroup["groups"]);
      parsed.forEach(g => g.items.length = 0);
      state = stringify(parsed);
      history.replaceState(state, "apoj", encodeURIComponent(state));
    }
  }

  public restoreState() {
    if (location.pathname.length > 1) {
      this.particleGroup.groups.length = 0;
      try {
        const state = parse(decodeURIComponent(location.pathname.substring(location.pathname.lastIndexOf('/') + 1)));
        if (state?.length) {
          this.particleGroup.groups.push(...state);
          this.particleGroup.updateImages();
          this.particleGroup.groups.forEach(group => this.particleGroup.updateParticleCount(group));
          return;
        }
      } catch (e) {
        console.error("Кривой стейт", location.pathname);
      }
    }
    this.seedControl.setValue("фпжлж");
  }

  public pause() {
    this.particleGroup.pause();
    this.saveState();
  }

  public addParticles(group: Group, step: number) {
    group.count -= Math.round(step);
    this.particleGroup.updateParticleCount(group);
    this.saveState();
  }

  public increaseRadius(group: Group, step: number) {
    const newRadius = group.particleRadius - step;
    if (newRadius < 1 || group.ranges.find(range => range <= newRadius)) {
      return;
    }
    group.particleRadius = newRadius;

    this.particleGroup.updateImages();
    this.saveState();
  }

  public increaseRange(group: Group, i: number, step: number) {
    const newValue = group.ranges[i] - step;
    if (newValue < group.particleRadius) {
      return;
    }
    group.ranges[i] = newValue;
    this.particleGroup.updateImages();
    this.saveState();
  }

  public increaseAttitude(group: Group, i: number, step: number) {
    group.forces[i] = group.forces[i] - step;
    this.particleGroup.updateImages();
    this.saveState();
  }

  public removeGroup(group: Group) {
    this.particleGroup.removeGroup(group);
    this.saveState();
  }

  public addDefaultGroup() {
    const attitudes = this.particleGroup.groups.map(() => 0);
    attitudes.push(-1);
    const defaultRadius = 25;
    const defaultSize = 25;
    const ranges = this.particleGroup.groups.map(() => defaultRadius);
    ranges.push(defaultRadius);

    const hsl = this.particleGroup.getColor(this.particleGroup.groups.length);
    const group: Group = {
      items: [],
      count: (this.renderService.canvas.width * this.renderService.canvas.height) / defaultSize / 400,
      forces: attitudes,
      ranges,
      hsl,
      colorStr: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
      particleRadius: defaultSize,
      isRunning: this.particleGroup.isRunning,
    };

    this.particleGroup.addGroup(group);
    this.saveState();
  }

  public randomString(len = 5) {
    const possible = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЫЭЮяабвгдеёжзийклмнопрстуфхцчшщыэюя".toLowerCase();
    const possibleLength = possible.length;
    const result = [];
    for (let i = len; i--;) {
      result.push(possible.charAt(Math.floor(Math.random() * possibleLength)));
    }
    return result.join("");
  }

  private statsBuffered$(n: number) {
    return this.particleGroup.stats$.pipe(
      bufferCount(n),
      map((buffer: Array<Stats>) => buffer.reduce((acc, curr) => {
        acc.fps += curr.fps;
        acc.drawTime += curr.drawTime;
        acc.computeTime += curr.computeTime;
        return acc;
      }, {fps: 0, computeTime: 0, drawTime: 0})),
      tap(stats => {
        stats.fps /= n;
        stats.drawTime /= n;
        stats.computeTime /= n;
      }),
    )
  }

}
