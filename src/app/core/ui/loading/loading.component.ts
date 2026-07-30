import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

@Component({
  selector: 'app-loading',

  standalone: true,

  templateUrl:
    './loading.component.html',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class LoadingComponent {
  readonly message =
    input('Loading...');
}