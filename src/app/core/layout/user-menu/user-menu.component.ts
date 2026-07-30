import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from "@angular/core";

import { Router } from "@angular/router";

import { AuthService } from "../../auth/auth.service";
import { IconComponent } from "../../ui/icon/icon.component";

@Component({
  selector: "app-user-menu",
  standalone: true,
  imports: [IconComponent],
  templateUrl: "./user-menu.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);

  readonly currentUser = this.authService.currentUser;

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  async logout(): Promise<void> {
    this.close();

    await this.authService.logout();
    await this.router.navigateByUrl("/login");
  }

  @HostListener("document:click")
  clickOutside() {
    this.close();
  }

  stop(event: Event) {
    event.stopPropagation();
  }
}
