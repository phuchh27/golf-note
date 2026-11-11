import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { LanguageService } from "../../core/i18n/language.service";
import { IconComponent } from "../../core/ui/icon/icon.component";
import { ToastService } from "../../core/ui/toast.service";

interface TaskUpdate {
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
  updates: TaskUpdate[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  statusMessage?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <main
      class="mx-auto min-h-screen w-full max-w-4xl px-4 py-5 pb-28 sm:px-6 sm:py-8 sm:pb-10"
    >
      <button
        type="button"
        class="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-(--color-text-secondary) hover:bg-black/5"
        (click)="backToTasks()"
      >
        <app-icon name="handover" [size]="17" />{{
          languageService.dictionary().handover.taskList
        }}
      </button>

      @if (isLoading()) {
        <div
          class="rounded-3xl border border-black/5 bg-white p-10 text-center text-sm text-(--color-text-secondary)"
        >
          {{ languageService.dictionary().handover.loading }}
        </div>
      } @else if (task(); as current) {
        <article
          class="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-(--shadow-lg)"
        >
          <header
            class="border-b border-black/5 bg-linear-to-br from-white to-(--color-brand-light)/40 p-5 sm:p-7"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full bg-(--color-brand-light) px-3 py-1 text-xs font-bold text-(--color-brand)"
                >{{
                  current.area || languageService.dictionary().handover.area
                }}</span
              >
              <span
                class="rounded-full px-3 py-1 text-xs font-bold"
                [class.bg-rose-50]="
                  current.priority === 'URGENT' || current.priority === 'HIGH'
                "
                [class.text-rose-700]="
                  current.priority === 'URGENT' || current.priority === 'HIGH'
                "
                [class.bg-slate-100]="
                  current.priority === 'NORMAL' || current.priority === 'LOW'
                "
                [class.text-slate-700]="
                  current.priority === 'NORMAL' || current.priority === 'LOW'
                "
                >{{ priorityText(current.priority) }}</span
              >
              @if (isOverdue(current)) {
                <span
                  class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700"
                  >{{ languageService.dictionary().handover.overdue }}</span
                >
              }
            </div>
            <h1
              class="mt-4 text-2xl font-bold tracking-tight text-(--color-text-primary) sm:text-3xl"
            >
              {{ current.title }}
            </h1>
            @if (current.description) {
              <p
                class="mt-3 whitespace-pre-wrap text-sm leading-6 text-(--color-text-secondary) sm:text-base"
              >
                {{ current.description }}
              </p>
            }
            <div
              class="mt-5 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 sm:text-sm"
            >
              <div class="rounded-2xl bg-white/80 p-3">
                <p class="text-(--color-text-muted)">
                  {{ languageService.dictionary().handover.createdBy }}
                </p>
                <p class="mt-1 font-semibold text-(--color-text-primary)">
                  {{ current.creatorName }}
                </p>
              </div>
              <div class="rounded-2xl bg-white/80 p-3">
                <p class="text-(--color-text-muted)">
                  {{ languageService.dictionary().handover.assignee }}
                </p>
                <p class="mt-1 font-semibold text-(--color-text-primary)">
                  {{ current.assigneeName || "—" }}
                </p>
              </div>
              <div class="col-span-2 rounded-2xl bg-white/80 p-3 sm:col-span-1">
                <p class="text-(--color-text-muted)">
                  {{ languageService.dictionary().handover.dueDate }}
                </p>
                <p class="mt-1 font-semibold text-(--color-text-primary)">
                  {{
                    current.dueAt ? (current.dueAt | date: "dd/MM/yyyy") : "—"
                  }}
                </p>
              </div>
            </div>
          </header>

          <section class="grid gap-5 p-5 sm:grid-cols-[220px_1fr] sm:p-7">
            <div>
              <label class="text-sm font-semibold text-(--color-text-secondary)"
                >{{ languageService.dictionary().handover.statusLabel }}
                <select
                  class="gn-input mt-2"
                  [ngModel]="selectedStatus()"
                  (ngModelChange)="selectedStatus.set($event)"
                  [ngModelOptions]="{ standalone: true }"
                >
                  <option value="OPEN">
                    {{ languageService.dictionary().handover.open }}
                  </option>
                  <option value="IN_PROGRESS">
                    {{ languageService.dictionary().handover.inProgress }}
                  </option>
                  <option value="BLOCKED">
                    {{ languageService.dictionary().handover.blocked }}
                  </option>
                  <option value="DONE">
                    {{ languageService.dictionary().handover.done }}
                  </option>
                  <option value="CANCELLED">
                    {{ languageService.dictionary().handover.cancelled }}
                  </option>
                </select>
              </label>
              <label
                class="mt-4 block text-sm font-semibold text-(--color-text-secondary)"
                >{{ languageService.dictionary().handover.updateNote }}
                <textarea
                  class="gn-input mt-2 min-h-24"
                  [ngModel]="note()"
                  (ngModelChange)="note.set($event)"
                  [ngModelOptions]="{ standalone: true }"
                ></textarea>
              </label>
              <button
                type="button"
                class="gn-button-primary mt-3 w-full px-4"
                (click)="saveUpdate()"
                [disabled]="isSaving()"
              >
                {{
                  isSaving()
                    ? languageService.dictionary().handover.saving
                    : languageService.dictionary().handover.addUpdate
                }}
              </button>
            </div>

            <div>
              <h2 class="text-lg font-bold text-(--color-text-primary)">
                {{ languageService.dictionary().handover.taskHistory }}
              </h2>
              <div class="mt-4 space-y-4">
                @for (update of current.updates; track update.id) {
                  <div
                    class="relative border-l-2 border-(--color-brand)/20 pl-4"
                  >
                    <span
                      class="absolute -left-1.25 top-1 h-2 w-2 rounded-full bg-(--color-brand)"
                    ></span>
                    <div
                      class="flex flex-wrap items-center justify-between gap-2"
                    >
                      <p class="text-sm font-bold text-(--color-text-primary)">
                        {{ statusText(update.status) }}
                      </p>
                      <time class="text-xs text-(--color-text-muted)">{{
                        update.createdAt | date: "dd/MM/yyyy HH:mm"
                      }}</time>
                    </div>
                    <p class="mt-1 text-xs text-(--color-text-secondary)">
                      {{ update.actorName }}
                    </p>
                    @if (update.note) {
                      <p
                        class="mt-2 whitespace-pre-wrap text-sm text-(--color-text-secondary)"
                      >
                        {{ update.note }}
                      </p>
                    }
                  </div>
                } @empty {
                  <p
                    class="rounded-2xl bg-black/2.5 p-4 text-sm text-(--color-text-muted)"
                  >
                    {{ languageService.dictionary().handover.emptyHistory }}
                  </p>
                }
              </div>
            </div>
          </section>
        </article>
      }
    </main>
  `,
})
export default class HandoverTaskDetailPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly languageService = inject(LanguageService);

  readonly task = signal<HandoverTask | null>(null);
  readonly selectedStatus = signal("OPEN");
  readonly note = signal("");
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadTask();
  }

  async loadTask(): Promise<void> {
    this.isLoading.set(true);
    const id = this.route.snapshot.paramMap.get("id");
    try {
      if (!id) throw new Error("HANDOVER_TASK_NOT_FOUND");
      const response = await firstValueFrom(
        this.http.get<ApiResponse<HandoverTask>>(
          `/api/v1/handover/${encodeURIComponent(id)}`,
          { withCredentials: true },
        ),
      );
      this.task.set(response.data);
      this.selectedStatus.set(response.data.status);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tải công việc.",
      );
      void this.router.navigateByUrl("/handover");
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveUpdate(): Promise<void> {
    const current = this.task();
    if (!current) return;
    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.http.patch(
          `/api/v1/handover/${encodeURIComponent(current.id)}`,
          {
            status: this.selectedStatus(),
            note: this.note().trim() || undefined,
          },
          { withCredentials: true },
        ),
      );
      this.note.set("");
      this.toast.success(this.languageService.dictionary().handover.updated);
      await this.loadTask();
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể cập nhật công việc.",
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  backToTasks(): void {
    void this.router.navigateByUrl("/handover");
  }

  statusText(status: string): string {
    const labels = this.languageService.dictionary().handover;
    return (
      (
        {
          OPEN: labels.open,
          IN_PROGRESS: labels.inProgress,
          BLOCKED: labels.blocked,
          DONE: labels.done,
          CANCELLED: labels.cancelled,
        } as Record<string, string>
      )[status] ?? status
    );
  }

  priorityText(priority: string): string {
    const labels = this.languageService.dictionary().handover;
    return (
      (
        {
          LOW: labels.low,
          NORMAL: labels.normal,
          HIGH: labels.high,
          URGENT: labels.urgent,
        } as Record<string, string>
      )[priority] ?? priority
    );
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
