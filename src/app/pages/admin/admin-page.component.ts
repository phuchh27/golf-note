import { HttpClient } from "@angular/common/http";
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { ToastService } from "../../core/ui/toast.service";
import { IconComponent } from "../../core/ui/icon/icon.component";

@Component({
  selector: "app-admin-page",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: "./admin-page.component.html",
})
export default class AdminPage {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    username: ["", [Validators.required, Validators.minLength(3)]],

    fullName: ["", [Validators.required, Validators.minLength(2)]],

    password: ["", [Validators.required, Validators.minLength(6)]],

    role: ["USER", Validators.required],
  });

  readonly isSubmitting = signal(false);

  readonly message = signal<string | null>(null);

  createUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      this.message.set("Vui lòng điền đầy đủ thông tin.");

      return;
    }

    this.isSubmitting.set(true);

    this.message.set(null);

    this.http
      .post<{
        success: boolean;
        user?: {
          username: string;
        };
      }>("/api/v1/admin/users", this.form.getRawValue(), {
        withCredentials: true,
      })
      .subscribe({
        next: () => {
          this.toastService.success("Tạo người dùng thành công.");

          this.message.set("Tài khoản đã được tạo thành công.");

          this.form.reset({
            username: "",
            fullName: "",
            password: "",
            role: "USER",
          });
        },

        error: (error) => {
          const message =
            error?.error?.statusMessage ?? "Không thể tạo người dùng lúc này.";

          this.toastService.error(message);

          this.message.set(message);

          this.isSubmitting.set(false);
        },

        complete: () => {
          this.isSubmitting.set(false);
        },
      });
  }
}
