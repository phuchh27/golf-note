import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { Router } from "@angular/router";

import { AuthService } from "../../auth/auth.service";
import { IconComponent } from "../../ui/icon/icon.component";
import { UserMenuComponent } from "../user-menu/user-menu.component";

@Component({
  selector: "app-dashboard-header",
  standalone: true,
  imports: [
    IconComponent,
    UserMenuComponent,
  ],
  templateUrl: "./dashboard-header.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.currentUser());

  readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";

    return "Good evening";
  });

  readonly pageTitle = computed(() => {
    const url = this.router.url;

    if (url.startsWith("/inventory")) return "Inventory";
    if (url.startsWith("/sales")) return "Sales";
    if (url.startsWith("/booking")) return "Booking";
    if (url.startsWith("/report")) return "Reports";
    if (url.startsWith("/admin")) return "Admin";

    return "Dashboard";
  });
}