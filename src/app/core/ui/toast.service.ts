import { Injectable, signal } from "@angular/core";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Injectable({
  providedIn: "root",
})
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = "info", duration = 3500): void {
    const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

    this._toasts.update((toasts) => [
      ...toasts,
      {
        id,
        message,
        type,
      },
    ]);

    setTimeout(() => this.remove(id), duration);
  }

  success(message: string, duration = 3500): void {
    this.show(message, "success", duration);
  }

  error(message: string, duration = 4500): void {
    this.show(message, "error", duration);
  }

  info(message: string, duration = 3500): void {
    this.show(message, "info", duration);
  }

  warning(message: string, duration = 4500): void {
    this.show(message, "warning", duration);
  }

  remove(id: string): void {
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
