import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { LanguageService } from "../../i18n/language.service";
import { IconComponent } from "../../ui/icon/icon.component";

interface PendingTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  area?: string | null;
  dueAt?: string | null;
}

interface PendingTaskSummary {
  count: number;
  tasks: PendingTask[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Component({
  selector: "app-dashboard-overview",
  standalone: true,
  imports: [IconComponent],
  templateUrl: "./dashboard-overview.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverviewComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly languageService = inject(LanguageService);
  /**
   * Demo data
   * Sau này sẽ lấy từ Dashboard API
   */
  readonly todayBookings = signal(18);

  readonly upcomingBookings = signal(6);

  readonly pendingTasks = signal(0);
  readonly pendingTaskPreview = signal<PendingTask[]>([]);

  readonly guestsToday = signal(42);

  readonly todayTasks = signal(0);

  ngOnInit(): void {
    void this.loadPendingTasks();
  }

  async loadPendingTasks(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PendingTaskSummary>>(
          "/api/v1/handover/summary",
          { withCredentials: true },
        ),
      );
      this.pendingTasks.set(response.data.count);
      this.todayTasks.set(response.data.count);
      this.pendingTaskPreview.set(response.data.tasks);
    } catch {
      this.pendingTasks.set(0);
      this.todayTasks.set(0);
      this.pendingTaskPreview.set([]);
    }
  }

  openTask(taskId: string): void {
    void this.router.navigate(["/handover", taskId]);
  }

  openTasks(): void {
    void this.router.navigateByUrl("/handover");
  }

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
    return this.circumference - (this.progress() / 100) * this.circumference;
  });

  /**
   * Progress Bars
   */

  readonly todayPercent = computed(() => {
    return Math.min((this.todayBookings() / 25) * 100, 100);
  });

  readonly upcomingPercent = computed(() => {
    return Math.min((this.upcomingBookings() / 15) * 100, 100);
  });

  readonly taskPercent = computed(() => {
    return Math.min((this.pendingTasks() / 20) * 100, 100);
  });

  readonly todayTasksPercent = computed(() => {
    return Math.min((this.todayTasks() / 15) * 100, 100);
  });

  readonly guestPercent = computed(() => {
    return Math.min((this.guestsToday() / 60) * 100, 100);
  });
}
