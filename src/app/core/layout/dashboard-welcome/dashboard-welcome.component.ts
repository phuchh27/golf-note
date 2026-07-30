import { Component, computed, inject, signal } from "@angular/core";
import { AuthService } from "../../auth/auth.service";

@Component({
  selector: "app-dashboard-welcome",
  standalone: true,
  templateUrl: "./dashboard-welcome.component.html",
})
export class DashboardWelcomeComponent {
  private readonly authService = inject(AuthService);
  readonly currentUser = computed(() => this.authService.currentUser());
  readonly userName = computed(() => this.currentUser()?.fullName || "Guest");
  readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";

    if (hour < 18) return "Good afternoon";

    return "Good evening";
  });

  readonly today = computed(() =>
    new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date()),
  );

  readonly shift = signal("Morning Shift");
}