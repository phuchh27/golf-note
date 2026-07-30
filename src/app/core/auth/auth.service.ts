import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";

import {
  LoginRequest,
  LoginResponse,
  CurrentUser,
  UserRole,
  USER_ROLES,
} from "./auth.types";

import { ToastService } from "../ui/toast.service";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  // Current authenticated user.
  private readonly _currentUser = signal<CurrentUser | null>(null);

  // Login request state.
  private readonly _isLoading = signal(false);

  // Prevent UI/router from rendering before auth check completes.
  private readonly _isInitialized = signal(false);

  // Reuse the same startup auth request.
  private _initializePromise: Promise<void> | null = null;

  readonly currentUser = this._currentUser.asReadonly();

  readonly isLoading = this._isLoading.asReadonly();

  readonly isInitialized = this._isInitialized.asReadonly();

  private normalizeCurrentUser(
    user: Partial<CurrentUser> | null | undefined,
  ): CurrentUser | null {
    if (!user) {
      return null;
    }

    return {
      id: user.id ?? "",
      username: user.username ?? "",
      fullName: user.fullName ?? "",
      roles: Array.isArray(user.roles) ? user.roles : [],
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    };
  }

  /**
   * Restore authentication state from
   * the HttpOnly session cookie.
   */
  async initialize(): Promise<void> {
    if (this._initializePromise) {
      return this._initializePromise;
    }

    if (this._isInitialized()) {
      return;
    }

    this._initializePromise = (async () => {
      try {
        const data = await firstValueFrom(
          this.http.get<{ user: CurrentUser }>("/api/v1/auth/me", {
            withCredentials: true,
          }),
        );

        this._currentUser.set(this.normalizeCurrentUser(data.user));
        console.log("[AuthService] Auth session initialized", data.user);
      } catch (error: any) {
        if (error?.status !== 401) {
          console.error(
            "[AuthService] Failed to initialize auth session",
            error,
          );
        }

        this._currentUser.set(null);
      } finally {
        this._isInitialized.set(true);
        this._initializePromise = null;
      }
    })();

    return this._initializePromise;
  }

  /**
   * Check authentication state.
   */
  isAuthenticated(): boolean {
    return this._currentUser() !== null;
  }

  /**
   * Check whether current user has a role.
   */
  hasRole(role: UserRole): boolean {
    return this._currentUser()?.roles.includes(role) ?? false;
  }

  /**
   * Check whether current user has
   * at least one of the provided roles.
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const user = this._currentUser();

    if (!user) {
      return false;
    }

    return roles.some((role) => user.roles.includes(role));
  }

  /**
   * Check whether current user has
   * the super admin role.
   */
  hasSuperadminPermission(): boolean {
    return this.hasRole(USER_ROLES.SUPER_ADMIN as UserRole);
  }

  /**
   * Check whether current user has
   * a specific permission.
   */
  hasPermission(permission: string): boolean {
    return this._currentUser()?.permissions.includes(permission) ?? false;
  }

  /**
   * Check whether current user has
   * at least one permission.
   */
  hasAnyPermission(permissions: string[]): boolean {
    const user = this._currentUser();

    if (!user) {
      return false;
    }

    return permissions.some((permission) =>
      user.permissions.includes(permission),
    );
  }

  /**
   * Update current authenticated user.
   */
  setCurrentUser(user: CurrentUser): void {
    this._currentUser.set(this.normalizeCurrentUser(user));
  }

  /**
   * Clear local authentication state.
   */
  clearSession(): void {
    this._currentUser.set(null);
  }

  /**
   * Authenticate user and create
   * a server-side session.
   */
  async login(credentials: LoginRequest): Promise<CurrentUser> {
    this._isLoading.set(true);

    try {
      const data = await firstValueFrom(
        this.http.post<LoginResponse>("/api/v1/auth/login", credentials, {
          withCredentials: true,
        }),
      );

      const normalizedUser = this.normalizeCurrentUser(data.user);

      if (!normalizedUser) {
        throw new Error(
          "[AuthService] Login response did not contain a valid user.",
        );
      }

      this._currentUser.set(normalizedUser);

      return normalizedUser;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Revoke server session and
   * clear local authentication state.
   */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post("/api/v1/auth/logout", null, {
          withCredentials: true,
        }),
      );

      this.toastService.success("Đã đăng xuất thành công.");
    } catch (error) {
      console.warn("[AuthService] Logout request failed", error);

      this.toastService.error("Không thể đăng xuất. Vui lòng thử lại.");
    } finally {
      this.clearSession();
    }
  }
}
