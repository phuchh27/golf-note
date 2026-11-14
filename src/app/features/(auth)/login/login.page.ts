import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import { Component, inject, PLATFORM_ID, signal } from "@angular/core";

import { FormsModule } from "@angular/forms";

import { Router } from "@angular/router";

import { AuthService } from "../../../core/auth/auth.service";
import { ToastService } from "../../../core/ui/toast.service";

const REMEMBERED_USERNAME_COOKIE = "golf_note_remembered_username";
const REMEMBERED_USERNAME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

@Component({
  selector: "app-login-page",

  standalone: true,

  imports: [FormsModule],

  templateUrl: "./login.page.html",
})
export default class LoginPage {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  private readonly router = inject(Router);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const rememberedUsername = this.readRememberedUsername();

      if (rememberedUsername) {
        this.username = rememberedUsername;
        this.rememberMe = true;
      }
    }
  }

  username = "";

  password = "";

  rememberMe = false;

  showPassword = signal(false);

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

        rememberMe: this.rememberMe,
      });

      this.persistRememberedUsername(this.username.trim());

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

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  private readRememberedUsername(): string | null {
    const cookiePrefix = `${REMEMBERED_USERNAME_COOKIE}=`;
    const cookie = this.document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(cookiePrefix));

    if (!cookie) {
      return null;
    }

    try {
      return decodeURIComponent(cookie.slice(cookiePrefix.length)) || null;
    } catch {
      this.clearRememberedUsername();
      return null;
    }
  }

  private persistRememberedUsername(username: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.rememberMe) {
      this.clearRememberedUsername();
      return;
    }

    this.document.cookie =
      `${REMEMBERED_USERNAME_COOKIE}=${encodeURIComponent(username)}; ` +
      `Max-Age=${REMEMBERED_USERNAME_MAX_AGE_SECONDS}; Path=/; SameSite=Lax` +
      this.secureCookieAttribute();
  }

  private clearRememberedUsername(): void {
    this.document.cookie =
      `${REMEMBERED_USERNAME_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax` +
      this.secureCookieAttribute();
  }

  private secureCookieAttribute(): string {
    return this.document.location.protocol === "https:" ? "; Secure" : "";
  }
}
