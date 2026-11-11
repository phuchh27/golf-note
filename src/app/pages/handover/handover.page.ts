import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { LanguageService } from "../../core/i18n/language.service";
import { IconComponent } from "../../core/ui/icon/icon.component";
import { ToastService } from "../../core/ui/toast.service";

interface HandoverUpdate {
  id: string;
  actorName: string;
  status: string;
  note?: string | null;
  createdAt: string;
}

interface HandoverTask {
  id: string;
  title: string;
  description?: string | null;
  area?: string | null;
  creatorName: string;
  assigneeName?: string | null;
  status: string;
  priority: string;
  dueAt?: string | null;
  createdAt: string;
  updates: HandoverUpdate[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  statusMessage?: string;
}

interface HandoverForm {
  title: string;
  description: string;
  area: string;
  assigneeUsername: string;
  priority: string;
  dueAt: string;
  note: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: "./handover.page.html",
})
export default class HandoverPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly languageService = inject(LanguageService);

  readonly tasks = signal<HandoverTask[]>([]);
  readonly statusFilter = signal("");
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly noteDrafts = signal<Record<string, string>>({});
  readonly form = signal<HandoverForm>({
    title: "",
    description: "",
    area: "",
    assigneeUsername: "",
    priority: "NORMAL",
    dueAt: "",
    note: "",
  });

  async ngOnInit(): Promise<void> {
    await this.loadTasks();
  }

  async loadTasks(): Promise<void> {
    this.isLoading.set(true);
    const params = new URLSearchParams();
    if (this.statusFilter()) params.set("status", this.statusFilter());

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<HandoverTask[]>>(
          `/api/v1/handover?${params.toString()}`,
          { withCredentials: true },
        ),
      );
      this.tasks.set(response.data);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tải công việc bàn giao.",
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  setFormField(field: keyof HandoverForm, value: string): void {
    this.form.update((current) => ({ ...current, [field]: value }));
  }

  async createTask(): Promise<void> {
    const form = this.form();
    if (!form.title.trim()) {
      this.toast.warning(
        this.languageService.dictionary().handover.titleRequired,
      );
      return;
    }

    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          "/api/v1/handover",
          {
            ...form,
            dueAt: form.dueAt || undefined,
            assigneeUsername: form.assigneeUsername.trim() || undefined,
          },
          { withCredentials: true },
        ),
      );
      this.toast.success(this.languageService.dictionary().handover.created);
      this.form.set({
        title: "",
        description: "",
        area: "",
        assigneeUsername: "",
        priority: "NORMAL",
        dueAt: "",
        note: "",
      });
      await this.loadTasks();
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tạo công việc bàn giao.",
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  updateNote(taskId: string, note: string): void {
    this.noteDrafts.update((drafts) => ({ ...drafts, [taskId]: note }));
  }

  async updateStatus(task: HandoverTask, status: string): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.http.patch(
          `/api/v1/handover/${task.id}`,
          { status, note: this.noteDrafts()[task.id]?.trim() || undefined },
          { withCredentials: true },
        ),
      );
      this.noteDrafts.update((drafts) => ({ ...drafts, [task.id]: "" }));
      await this.loadTasks();
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể cập nhật công việc.",
      );
      await this.loadTasks();
    } finally {
      this.isSaving.set(false);
    }
  }

  statusText(status: string): string {
    const labels = this.languageService.dictionary().handover;
    const labelsByStatus: Record<string, string> = {
      OPEN: labels.open,
      IN_PROGRESS: labels.inProgress,
      BLOCKED: labels.blocked,
      DONE: labels.done,
      CANCELLED: labels.cancelled,
    };
    return labelsByStatus[status] ?? status;
  }

  priorityText(priority: string): string {
    const labels = this.languageService.dictionary().handover;
    const labelsByPriority: Record<string, string> = {
      LOW: labels.low,
      NORMAL: labels.normal,
      HIGH: labels.high,
      URGENT: labels.urgent,
    };
    return labelsByPriority[priority] ?? priority;
  }

  isOverdue(task: HandoverTask): boolean {
    return Boolean(
      task.dueAt &&
      new Date(task.dueAt).getTime() < Date.now() &&
      task.status !== "DONE" &&
      task.status !== "CANCELLED",
    );
  }
}
