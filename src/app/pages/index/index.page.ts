import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";

import { authGuard } from "../../core/auth/auth.guard";
import { AuthService } from "../../core/auth/auth.service";

import DashboardPage from "../dashboard/dashboard.page";
 

@Component({
  standalone: true,
  imports: [
    DashboardPage
  ],
  template: `
    <main
      class="
        mx-auto
        flex
        min-h-screen
        w-full
        max-w-7xl
        flex-col
        gap-8
        px-5
        py-6
        lg:px-8
      "
    >
      <app-dashboard-page />
    </main>
  `,
})
export default class IndexPage {
  readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  static route = {
    canActivate: [authGuard],
  };

  async logout(): Promise<void> {
    await this.authService.logout();

    await this.router.navigateByUrl("/login");
  }
}