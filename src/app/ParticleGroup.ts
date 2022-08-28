import {animationFrames, map, pairwise, ReplaySubject} from "rxjs";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
}

export interface Group {
  items: Array<Particle>;
  count: number;
  forces: Array<number>;
  ranges: Array<number>;
  hsl: [number, number, number];
  colorStr: string;
  particleRadius: number;
  isRunning: boolean;
}

export type RandomSettings = {
  particlesCount: number;
  getGroupsCount: () => number;
  groupParticlesCount: (max: number) => number;
  getSize: () => number;
  getRanges: (min: number) => Array<number>;
  getForces: () => Array<number>;
}

export interface Stats {
  computeTime: number;
  drawTime: number;
  fps: number;
}

export class ParticleGroup {
  public readonly groups: Array<Group> = [];
  public readonly images: Array<HTMLCanvasElement> = [];

  public isRunning = true;
  public dampening = .993;
  public dt = .001;

  public readonly stats: Stats = {
    computeTime: 0,
    fps: 0,
    drawTime: 0,
  };
  public readonly stats$ = new ReplaySubject<Stats>(1);

  public readonly animationFrame$ = animationFrames().pipe(
    pairwise(),
    map(([prev, cur]) => [cur.timestamp, Math.min(cur.timestamp - prev.timestamp, 20)] as [number, number]),
  );

  public constructor(public readonly ctx: CanvasRenderingContext2D) {
    this.animationFrame$.subscribe(([, dt]: [number, number]) => {

      performance.mark("computeStart");
      if (this.dt) {
        this.step(this.groups, dt * this.dt);
      }
      performance.mark("computeEnd");

      performance.mark("drawStart");
      this.draw(this.ctx);
      performance.mark("drawEnd");

      this.stats.computeTime = performance.measure("compute", "computeStart", "computeEnd").duration;
      this.stats.drawTime = performance.measure("draw", "drawStart", "drawEnd").duration;
      this.stats.fps = 1000 / dt;
      this.stats$.next(this.stats);
    });
  }

  public addGroup(group: Group): Group {
    for (let i = 0, len = this.groups.length; i < len; i++) {
      if (group.ranges[i] < group.particleRadius) {
        throw new Error(`Particle too big, ${group.ranges[i]} < ${group.particleRadius}`);
      }
      const g = this.groups[i];
      g.forces.push(group.forces[i]);
      g.ranges.push(group.ranges[i]);
    }
    this.groups.push(group);
    this.updateParticleCount(group);
    this.updateImages();
    return group;
  }

  public pause() {
    this.isRunning = !this.isRunning;
    this.groups.forEach(g => g.isRunning = this.isRunning);
  }

  public removeGroup(group: Group) {
    group.items.length = 0;
    const i = this.groups.findIndex(g => g === group);
    this.groups.splice(i, 1);
    this.groups.forEach(g => {
      g.ranges.splice(i, 1);
      g.forces.splice(i, 1);
    });
    this.updateImages();
  }

  public clear() {
    this.groups.forEach(g => g.items.length = 0);
    this.groups.length = 0;
  }

  public random(params: RandomSettings) {
    this.clear();

    const groupCount = Math.round(params.getGroupsCount());
    const maxParticlesCount = Math.round(params.particlesCount / groupCount);
    for (let i = 0; i < groupCount; i++) {
      const hsl = this.getColor(this.groups.length);
      const particleRadius = params.getSize();
      const group: Group = {
        count: params.groupParticlesCount(maxParticlesCount),
        forces: params.getForces(),
        ranges: params.getRanges(particleRadius),
        particleRadius,
        isRunning: this.isRunning,
        items: [],
        hsl,
        colorStr: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
      }

      this.addGroup(group);
    }
  }

  public getColor(index: number): [number, number, number] {
    return [Math.floor(((index * 1.61803398875) * 360) % 360), 70, 60];
  }

  public getColorString(index: number): string {
    const color = this.getColor(index);
    return `hsl(${color[0]}, ${color[1]}%, ${color[2]}%)`;
  }

  public step(groups: Array<Group>, dt: number) {
    for (let i = 0, len = groups.length; i < len; i++) {
      if (!groups[i].isRunning) {
        continue;
      }
      for (let j = 0; j < len; j++) {
        if (groups[i].forces[j] === 0) {
          continue;
        }
        interactGroup(groups[i], groups[j], groups[i].forces[j], groups[i].ranges[j], dt, innerWidth, innerHeight, this.dampening);
      }
    }
  }

  public updateParticleCount(group: Group) {
    const d = group.count - group.items.length;
    if (d === 0) {
      return;
    } else if (d < 0) {
      group.items.length = group.items.length + d;
    } else if (d > 0) {
      const w = this.ctx.canvas.width;
      const h = this.ctx.canvas.height;
      for (let i = 0; i < d; i++) {
        group.items.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: 0, vy: 0,
          ax: 0, ay: 0,
        });
      }
    }
  }

  public get computationsPerFrame() {
    const groups = this.groups;
    let k = 0;
    for (let i = 0, len = groups.length; i < len; i++) {
      for (let j = 0; j < len; j++) {
        if (!groups[i].isRunning || groups[i].forces[j] === 0) {
          continue;
        }
        k += groups[i].items.length * groups[j].items.length;
      }
    }
    return k;
  }

  public updateImages() {
    for (let i = 0, len = this.groups.length; i < len; i++) {
      this.updateGroupImage(i);
    }
  }

  private updateGroupImage(i: number) {
    const group = this.groups[i];
    // const sortedIndices = [];
    // for (let i = 0, len = group.forces.length; i < len; i++) {
    //   sortedIndices.push(i);
    // }
    // sortedIndices.sort((a, b) => group.ranges[b] - group.ranges[a]);

    const sortedRanges = [...group.ranges].sort((a, b) => b - a);
    const center = sortedRanges[0];
    const arrowSize = 5;
    const image = this.images[i] ?? (this.images[i] = document.createElement("canvas"));
    image.width = center * 2 + arrowSize * 2;
    image.height = center * 2 + arrowSize * 2;
    const ctx = image.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, image.width, image.height);
    ctx.translate(center + arrowSize, center + arrowSize);

    const drawArrows = (r: number, force: number, hslStr: string) => {
      const steps = 5;
      const size = arrowSize * Math.sign(force);
      for (let i = 0, max = Math.PI * 2, step = max / steps; i <= max; i += step) {
        ctx.beginPath();
        ctx.rotate(step);
        ctx.moveTo(r, 0);
        ctx.lineTo(r - size, size);
        ctx.moveTo(r, 0);
        ctx.lineTo(r - size, -size);
        ctx.strokeStyle = `hsla(${hslStr} 1)`;
        ctx.stroke();
      }
    }

    const drawGradient = (r: number, force: number, hslStr: string) => {
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      if (force > 0) {
        grd.addColorStop(0, `hsla(${hslStr} ${force})`);
        grd.addColorStop(1, `hsla(${hslStr} 0)`);
      } else {
        grd.addColorStop(0, `hsla(${hslStr} 0)`);
        grd.addColorStop(1, `hsla(${hslStr} ${-force})`);
      }
      ctx.fillStyle = grd;
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }

    // for (let i = 0, len = group.ranges.length; i < len; i++) {
    //   ctx.beginPath();
    //   const force = group.forces[i];
    //   if (force === 0) {
    //     continue;
    //   }
    //   const hsl = this.groups[i].hsl;
    //   const hslStr = `${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%,`;
    //   drawGradient(sortedRanges[i] * .5, force/len, hslStr);
    //   // drawArrows(sortedRanges[i], force, hslStr);
    // }

    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(0, 0, group.particleRadius * .5, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = `hsla(${group.hsl[0]}, ${group.hsl[1]}%, ${group.hsl[2]}%, 1)`;
    ctx.fill();
    ctx.stroke();
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    for (let i = 0, len = this.groups.length; i < len; i++) {
      const group = this.groups[i];
      const image = this.images[i];
      const imageShift = [image.width * .5, image.height * .5];
      for (let j = 0, len2 = group.items.length, particle; j < len2; j++) {
        particle = group.items[j];
        ctx.drawImage(image, particle.x - imageShift[0], particle.y - imageShift[1]);
      }
    }
  }
}

const interactParticle = (a: Particle, b: Particle, f: number, maxDistance: number, particleRadius: number) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dSq = (dx ** 2 + dy ** 2) + Number.EPSILON;
  const distance = (dSq ** .5) + Number.EPSILON;

  if (distance < particleRadius) {
    const F = -6 / distance;
    a.ax -= F * dx;
    a.ay -= F * dy;
  } else if (distance < maxDistance) {
    const F = f / distance;
    a.ax -= F * dx;
    a.ay -= F * dy;
  }
};

const interactGroup = (group1: Group, group2: Group, f: number, maxDistance: number, dt: number, width: number, height: number, dampening: number) => {
  for (let i = 0, len1 = group1.items.length; i < len1; i++) {
    const a: Particle = group1.items[i];
    a.ax = 0;
    a.ay = 0;
    for (let j = 0, len2 = group2.items.length; j < len2; j++) {
      const b: Particle = group2.items[j];
      interactParticle(a, b, f, maxDistance, group1.particleRadius);
    }
    a.vx += dt * a.ax;
    a.vy += dt * a.ay;

    a.vx *= dampening;
    a.vy *= dampening;
    a.x += a.vx;
    a.y += a.vy;
    constraint(a, group1.particleRadius, width, height);
  }
}

const constraint = (particle: Particle, r: number, width: number, height: number) => {
  if (particle.x < r) {
    particle.x = r;
    particle.vx *= -1;
  } else if (particle.x > width - r) {
    particle.x = width - r;
    particle.vx *= -1;
  }
  if (particle.y < r) {
    particle.y = r;
    particle.vy *= -1;
  } else if (particle.y > height - r) {
    particle.y = height - r;
    particle.vy *= -1;
  }
}
