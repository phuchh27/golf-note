import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from "@angular/core";

import { IconComponent } from "../../ui/icon/icon.component";

@Component({
  selector: "app-dashboard-overview",
  standalone: true,
  imports: [IconComponent],
  templateUrl: "./dashboard-overview.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverviewComponent {
  /**
   * Demo data
   * Sau này sẽ lấy từ Dashboard API
   */
  readonly todayBookings = signal(18);

  readonly upcomingBookings = signal(6);

  readonly pendingTasks = signal(12);

  readonly guestsToday = signal(42);

  readonly todayTasks = signal(12);

  /**
   * Donut Progress
   */

  readonly progress = computed(() => {
    const today = this.todayBookings();
    const upcoming = this.upcomingBookings();

    if (today === 0) {
      return 0;
    }

    return (upcoming / today) * 100;
  });

  /**
   * SVG Circle
   */

  readonly circumference = 540;

  readonly progressOffset = computed(() => {
    return (
      this.circumference -
      (this.progress() / 100) * this.circumference
    );
  });

  /**
   * Progress Bars
   */

  readonly todayPercent = computed(() => {
    return Math.min(
      (this.todayBookings() / 25) * 100,
      100,
    );
  });

  readonly upcomingPercent = computed(() => {
    return Math.min(
      (this.upcomingBookings() / 15) * 100,
      100,
    );
  });

  readonly taskPercent = computed(() => {
    return Math.min(
      (this.pendingTasks() / 20) * 100,
      100,
    );
  });

  readonly todayTasksPercent = computed(() => {
    return Math.min(
      (this.todayTasks() / 15) * 100,
      100,
    );
  });

  readonly guestPercent = computed(() => {
    return Math.min(
      (this.guestsToday() / 60) * 100,
      100,
    );
  });

  /**
   * Fake realtime update
   * Demo animation
   */

  refresh(): void {
    this.todayBookings.update(
      value => value + Math.floor(Math.random() * 2),
    );

    this.upcomingBookings.update(
      value => value + Math.floor(Math.random() * 2),
    );

    this.pendingTasks.update(
      value => Math.max(
        0,
        value + Math.floor(Math.random() * 3) - 1,
      ),
    );

    this.todayTasks.update(
      value => Math.max(
        0,
        value + Math.floor(Math.random() * 3) - 1,
      ),
    );

    this.guestsToday.update(
      value => value + Math.floor(Math.random() * 3),
    );
  }
}