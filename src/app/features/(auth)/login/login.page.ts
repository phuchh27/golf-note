import { Component, inject, signal } from "@angular/core";

import { FormsModule } from "@angular/forms";

import { Router } from "@angular/router";

import { AuthService } from "../../../core/auth/auth.service";
import { ToastService } from "../../../core/ui/toast.service";

@Component({
  selector: "app-login-page",

  standalone: true,

  imports: [FormsModule],

  templateUrl: "./login.page.html",
})
export default class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  private readonly router = inject(Router);

  username = "";

  password = "";

  isLoading = signal(false);

  errorMessage = signal("");

  async login(): Promise<void> {
    if (!this.username.trim() || !this.password) {
      this.errorMessage.set("Vui lòng nhập tên đăng nhập và mật khẩu.");

      return;
    }

    this.isLoading.set(true);

    this.errorMessage.set("");

    try {
      await this.authService.login({
        username: this.username.trim(),

        password: this.password,
      });

      await this.router.navigateByUrl("/");
      this.toastService.success("Đăng nhập thành công.");
    } catch (error) {
      console.error("Login failed:", error);

      this.errorMessage.set("Tên đăng nhập hoặc mật khẩu không chính xác.");
      this.toastService.error("Đăng nhập thất bại. Vui lòng kiểm tra lại.");
    } finally {
      this.isLoading.set(false);
    }
  }
}
