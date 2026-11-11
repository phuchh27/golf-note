import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { LanguageService } from "../../core/i18n/language.service";
import { IconComponent } from "../../core/ui/icon/icon.component";
import { ToastService } from "../../core/ui/toast.service";

interface ArchiveEntry {
  id: string;
  title: string;
  type: "TEXT" | "LINK" | "IMAGE";
  content: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  statusMessage?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: "./archive.page.html",
})
export default class ArchivePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly languageService = inject(LanguageService);

  readonly entries = signal<ArchiveEntry[]>([]);
  readonly search = signal("");
  readonly typeFilter = signal("");
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly draftTitle = signal("");
  readonly draftType = signal<"TEXT" | "LINK">("TEXT");
  readonly draftContent = signal("");

  readonly filteredEntries = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    const type = this.typeFilter();
    return this.entries().filter((entry) => {
      if (type && entry.type !== type) return false;
      if (!term) return true;
      return `${entry.title} ${entry.content}`.toLocaleLowerCase().includes(term);
    });
  });

  ngOnInit(): void {
    void this.loadEntries();
  }

  async loadEntries(): Promise<void> {
    this.isLoading.set(true);
    try {
      const params = new URLSearchParams();
      if (this.search().trim()) params.set("search", this.search().trim());
      if (this.typeFilter()) params.set("type", this.typeFilter());
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ArchiveEntry[]>>(
          `/api/v1/archive?${params.toString()}`,
          { withCredentials: true },
        ),
      );
      this.entries.set(response.data);
    } catch (error: any) {
      this.toast.error(error?.error?.statusMessage ?? "Không thể tải kho lưu trữ.");
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.draftTitle.set("");
    this.draftType.set("TEXT");
    this.draftContent.set("");
    this.editorOpen.set(true);
  }

  openEdit(entry: ArchiveEntry): void {
    if (entry.type === "IMAGE") {
      this.toast.info(this.languageService.dictionary().archive.imageComingSoon);
      return;
    }
    this.editingId.set(entry.id);
    this.draftTitle.set(entry.title);
    this.draftType.set(entry.type);
    this.draftContent.set(entry.content);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
  }

  async saveEntry(): Promise<void> {
    const title = this.draftTitle().trim();
    const content = this.draftContent().trim();
    if (!title || !content) {
      this.toast.warning("Vui lòng nhập tiêu đề và nội dung.");
      return;
    }
    if (this.draftType() === "LINK" && !this.isHttpUrl(content)) {
      this.toast.warning("Liên kết phải bắt đầu bằng http:// hoặc https://.");
      return;
    }

    this.isSaving.set(true);
    const id = this.editingId();
    try {
      const request = id
        ? this.http.patch<ApiResponse<ArchiveEntry>>(
            `/api/v1/archive/${encodeURIComponent(id)}`,
            { title, type: this.draftType(), content },
            { withCredentials: true },
          )
        : this.http.post<ApiResponse<ArchiveEntry>>(
            "/api/v1/archive",
            { title, type: this.draftType(), content },
            { withCredentials: true },
          );
      await firstValueFrom(request);
      this.closeEditor();
      await this.loadEntries();
      this.toast.success(this.languageService.dictionary().archive.saved);
    } catch (error: any) {
      this.toast.error(error?.error?.statusMessage ?? "Không thể lưu mục lưu trữ.");
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteEntry(entry: ArchiveEntry): Promise<void> {
    if (!window.confirm(this.languageService.dictionary().archive.deleteConfirm)) return;
    try {
      await firstValueFrom(
        this.http.delete<ApiResponse<{ id: string }>>(
          `/api/v1/archive/${encodeURIComponent(entry.id)}`,
          { withCredentials: true },
        ),
      );
      await this.loadEntries();
      this.toast.success(this.languageService.dictionary().archive.deleted);
    } catch (error: any) {
      this.toast.error(error?.error?.statusMessage ?? "Không thể xóa mục lưu trữ.");
    }
  }

  async activateEntry(entry: ArchiveEntry): Promise<void> {
    if (entry.type === "LINK") {
      if (!this.isHttpUrl(entry.content)) {
        this.toast.error("Liên kết không hợp lệ.");
        return;
      }
      window.open(entry.content, "_blank", "noopener,noreferrer");
      return;
    }
    if (entry.type === "IMAGE") {
      this.toast.info(this.languageService.dictionary().archive.imageComingSoon);
      return;
    }

    try {
      await navigator.clipboard.writeText(entry.content);
    } catch {
      const field = document.createElement("textarea");
      field.value = entry.content;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      if (!copied) {
        this.toast.error("Không thể sao chép văn bản trên thiết bị này.");
        return;
      }
    }
    this.toast.success(this.languageService.dictionary().archive.copied);
  }

  typeLabel(type: string): string {
    const labels = this.languageService.dictionary().archive;
    if (type === "LINK") return labels.linkType;
    if (type === "IMAGE") return labels.imageType;
    return labels.textType;
  }

  private isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }
}
