import { Component, inject, OnInit, signal, computed } from "@angular/core";

import { NavigationEnd, Router, RouterOutlet } from "@angular/router";

import { filter } from "rxjs/operators";

import { AuthService } from "./core/auth/auth.service";

import { LoadingComponent } from "./core/ui/loading/loading.component";
import { ToastContainerComponent } from "./core/ui/toast-container.component";
import { AppNavigationComponent } from "./core/ui/navigation/app-navigation.component";
@Component({
  selector: "app-root",

  standalone: true,

  imports: [
    RouterOutlet,
    LoadingComponent,
    ToastContainerComponent,
    AppNavigationComponent,
  ],

  template: `
    <app-toast-container />

    @if (!authService.isInitialized()) {
      <app-loading />
    } @else {
      <router-outlet />
      @if (!isLoginRoute()) {
        <app-navigation />
      }
    }
  `,
})
export class App implements OnInit {
  private readonly router = inject(Router);

  protected readonly authService = inject(AuthService);

  private readonly currentUrl = signal(this.router.url);

  protected readonly isLoginRoute = computed(() =>
    this.currentUrl().startsWith("/login"),
  );

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe(() => this.currentUrl.set(this.router.url));
  }

  /**
   * Initialize authentication
   * before rendering the application.
   */
  async ngOnInit(): Promise<void> {
    await this.authService.initialize();
  }
}
