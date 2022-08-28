import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Stats} from "../ParticleGroup";

@Component({
  selector: 'app-stats[stats]',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsComponent {
  @Input()
  public stats!: Stats;
}
