import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

import { AuthService } from "../../auth/auth.service";
import { LanguageService } from "../../i18n/language.service";
import { IconComponent } from "../icon/icon.component";
import { NAVIGATION_ITEMS } from "./navigation.config";

@Component({
  selector: "app-navigation",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <!-- ========================================================= -->
    <!-- MOBILE BOTTOM NAVIGATION                                  -->
    <!-- ========================================================= -->

    <nav
      class="
        mobile-glass-nav
        fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50
        isolate flex h-16 items-center
        rounded-[1.65rem]
        px-2
        md:hidden
      "
      aria-label="Mobile navigation"
    >
      <!-- HOME + HANDOVER -->
      @for (item of primaryMobileNavigationItems(); track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="is-active"
          [routerLinkActiveOptions]="{
            exact: item.route === '/',
          }"
          class="
            flex h-12 flex-1
            flex-col items-center justify-center
            gap-0.5
            rounded-2xl
            text-(--color-text-secondary)
            transition-all duration-200
            active:scale-95
          "
        >
          <app-icon [name]="item.icon" [size]="21" />

          <span
            class="
              text-[10px]
              font-semibold
              transition-colors duration-200
            "
          >
            {{ item.label }}
          </span>
        </a>
      }

      <!-- MORE -->
      <button
        type="button"
        class="
          flex h-12 flex-1
          flex-col items-center justify-center
          gap-0.5
          rounded-2xl
          text-(--color-text-secondary)
          transition-all duration-200
          active:scale-95
        "
        [class.is-active]="isMoreOpen()"
        aria-label="More navigation"
        [attr.aria-expanded]="isMoreOpen()"
        (click)="toggleMore()"
      >
        <app-icon name="more" [size]="21" />

        <span
          class="
            text-[10px]
            font-semibold
          "
        >
          More
        </span>
      </button>

      <!-- ======================================================= -->
      <!-- MOBILE QUICK ACTION                                     -->
      <!-- ======================================================= -->

      <button
        type="button"
        class="
          quick-action-button
          ml-1
          flex h-12 w-12
          shrink-0
          items-center justify-center
          rounded-full
          bg-white/90
          text-green-500
          shadow-[0_8px_25px_rgba(34,197,94,0.16)]
          ring-1 ring-black/5
          transition-all duration-300
          active:scale-90
        "
        [class.is-open]="isQuickActionsOpen()"
        [attr.aria-label]="languageService.dictionary().navigation.quickActions"
        [attr.aria-expanded]="isQuickActionsOpen()"
        (click)="toggleQuickActions()"
      >
        <span class="electric-ring"></span>

        <span class="quick-action-icon">
          <app-icon name="plus" [size]="24" />
        </span>
      </button>
    </nav>

    <!-- ========================================================= -->
    <!-- MOBILE MORE BACKDROP                                      -->
    <!-- ========================================================= -->

    @if (isMoreOpen()) {
      <div
        class="
          fixed inset-0 z-40
          bg-black/10
          backdrop-blur-[2px]
          md:hidden
        "
        aria-hidden="true"
        (click)="closeMore()"
      ></div>

      <!-- MORE BOTTOM SHEET -->
      <section
        class="
          fixed inset-x-3 bottom-28 z-50
          overflow-hidden
          rounded-4xl
          border border-white/70
          bg-white/90
          p-3
          shadow-[0_20px_60px_rgba(15,23,42,0.18)]
          backdrop-blur-2xl
          md:hidden
          animate-slide-up
        "
        aria-label="More navigation"
      >
        <!-- HANDLE -->
        <div
          class="
            mx-auto mb-3
            h-1 w-10
            rounded-full
            bg-black/10
          "
        ></div>

        <div class="grid grid-cols-3 gap-2">
          @for (item of moreMenuItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="is-active"
              [routerLinkActiveOptions]="{
                exact: item.route === '/',
              }"
              (click)="closeMore()"
              class="
                flex min-h-20
                flex-col
                items-center
                justify-center
                gap-2
                rounded-2xl
                text-[var(--color-text-secondary)]
                transition-all duration-200
                active:scale-95
              "
            >
              <app-icon [name]="item.icon" [size]="24" />

              <span
                class="
                  text-xs
                  font-semibold
                "
              >
                {{ item.label }}
              </span>
            </a>
          }
        </div>
      </section>
    }

    <!-- ========================================================= -->
    <!-- MOBILE QUICK ACTION BACKDROP                              -->
    <!-- ========================================================= -->

    @if (isQuickActionsOpen()) {
      <div
        class="
          fixed inset-0 z-40
          bg-black/10
          backdrop-blur-[2px]
          md:hidden
        "
        aria-hidden="true"
        (click)="closeQuickActions()"
      ></div>

      <!-- QUICK ACTION BOTTOM SHEET -->
      <section
        class="
          fixed inset-x-3 bottom-28 z-50
          rounded-[2rem]
          border border-white/70
          bg-white/90
          p-3
          shadow-[0_20px_60px_rgba(15,23,42,0.18)]
          backdrop-blur-2xl
          md:hidden
          animate-slide-up
        "
        [attr.aria-label]="languageService.dictionary().navigation.quickActions"
      >
        <!-- HANDLE -->
        <div
          class="
            mx-auto mb-3
            h-1 w-10
            rounded-full
            bg-black/10
          "
        ></div>

        <div class="grid grid-cols-2 gap-2">
          @for (action of quickActions; track action.route) {
            <a
              [routerLink]="action.route"
              (click)="closeQuickActions()"
              class="
                flex items-center gap-3
                rounded-2xl
                px-4 py-4
                text-sm font-semibold
                text-(--color-text-primary)
                transition-all duration-200
                hover:bg-black/[0.03]
                active:scale-[0.97]
              "
            >
              <app-icon [name]="action.icon" [size]="22" />

              <span>
                {{ languageService.dictionary().quickActions[action.key] }}
              </span>
            </a>
          }
        </div>
      </section>
    }

    <!-- ========================================================= -->
    <!-- DESKTOP RIGHT DOCK                                        -->
    <!-- ========================================================= -->

    <aside
      class="
        fixed right-6 top-1/2 z-50
        hidden
        -translate-y-1/2
        md:block
      "
      aria-label="Desktop navigation"
    >
      <nav
        class="
          flex w-20 flex-col items-center gap-2
          rounded-lg
          border border-white/70
          bg-white/70
          p-2
          shadow-[0_20px_60px_rgba(15,23,42,0.14)]
          backdrop-blur-2xl
          backdrop-saturate-150
        "
      >
        @for (item of desktopNavigationItems(); track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{
              exact: item.route === '/',
            }"
            class="
              group relative
              flex h-12 w-12
              items-center justify-center
              rounded-2xl
              text-(--color-text-secondary)
              transition-all duration-200
              hover:-translate-x-1
              active:scale-95
            "
          >
            <app-icon [name]="item.icon" [size]="22" />

            <!-- TOOLTIP -->
            <span
              class="
                pointer-events-none
                absolute right-16 top-1/2
                hidden
                -translate-y-1/2
                whitespace-nowrap
                rounded-xl
                bg-(--color-text-primary)
                px-3 py-2
                text-xs font-semibold
                text-white
                opacity-0
                shadow-lg
                transition-opacity duration-200
                group-hover:opacity-100
                md:block
              "
            >
              {{ item.label }}
            </span>
          </a>
        }

        <!-- DIVIDER -->
        <div
          class="
            my-1
            h-px w-8
            bg-(--color-border)
          "
        ></div>

        <!-- ===================================================== -->
        <!-- DESKTOP QUICK ACTION                                   -->
        <!-- ===================================================== -->

        <button
          type="button"
          class="
            quick-action-button
            flex h-12 w-12
            items-center justify-center
            rounded-2xl
            bg-white
            text-green-500
            shadow-[0_8px_20px_rgba(34,197,94,0.14)]
            ring-1 ring-black/5
            transition-all duration-300
            hover:-translate-x-1
            hover:shadow-xl
            active:scale-95
          "
          [class.is-open]="isQuickActionsOpen()"
          aria-label="Quick actions"
          [attr.aria-expanded]="isQuickActionsOpen()"
          (click)="toggleQuickActions()"
        >
          <span class="electric-ring"></span>

          <span class="quick-action-icon">
            <app-icon name="plus" [size]="24" />
          </span>
        </button>
      </nav>

      <!-- DESKTOP QUICK ACTION MENU -->
      @if (isQuickActionsOpen()) {
        <div
          class="
            absolute right-24 top-1/2
            flex w-56
            -translate-y-1/2
            flex-col gap-2
            rounded-3xl
            border border-white/70
            bg-white/85
            p-3
            shadow-[0_20px_60px_rgba(15,23,42,0.18)]
            backdrop-blur-2xl
            animate-slide-up
          "
        >
          @for (action of quickActions; track action.route) {
            <a
              [routerLink]="action.route"
              (click)="closeQuickActions()"
              class="
                flex items-center gap-3
                rounded-2xl
                px-4 py-3
                text-sm font-semibold
                text-(--color-text-primary)
                transition-all duration-200
                hover:bg-black/3
                active:scale-[0.97]
              "
            >
              <app-icon [name]="action.icon" [size]="20" />

              <span>
                {{ languageService.dictionary().quickActions[action.key] }}
              </span>
            </a>
          }
        </div>
      }
    </aside>
  `,

  styles: `
    :host {
      display: block;
    }

    .mobile-glass-nav {
      position: fixed;
      border: 1px solid rgba(255, 255, 255, 0.72);
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.58),
        rgba(245, 249, 253, 0.34)
      );
      -webkit-backdrop-filter: blur(30px) saturate(190%);
      backdrop-filter: blur(30px) saturate(190%);
      box-shadow:
        0 12px 34px rgba(15, 23, 42, 0.16),
        0 3px 10px rgba(15, 23, 42, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        inset 0 -1px 0 rgba(255, 255, 255, 0.28);
    }

    .mobile-glass-nav::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: inherit;
      pointer-events: none;
      background: linear-gradient(
        115deg,
        rgba(255, 255, 255, 0.34),
        transparent 48%,
        rgba(255, 255, 255, 0.08)
      );
    }

    .mobile-glass-nav > a,
    .mobile-glass-nav > button {
      position: relative;
      z-index: 1;
    }

    :host a,
    :host button {
      -webkit-tap-highlight-color: transparent;
    }

    /* ========================================================= */
    /* ACTIVE NAVIGATION                                         */
    /* ========================================================= */

    :host a.is-active,
    :host button.is-active {
      color: var(--color-text-primary);
      background: rgba(0, 0, 0, 0.045);
    }

    :host a.is-active app-icon,
    :host button.is-active app-icon {
      color: var(--color-text-primary);
    }

    /* ========================================================= */
    /* QUICK ACTION                                             */
    /* ========================================================= */

    .quick-action-button {
      position: relative;
      overflow: visible;
      isolation: isolate;

      color: #22c55e;

      transition:
        color 300ms ease,
        background-color 300ms ease,
        box-shadow 300ms ease,
        transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    /*
     * Quick action icon
     */

    .quick-action-icon {
      position: relative;
      z-index: 3;

      display: flex;
      align-items: center;
      justify-content: center;

      transition:
        transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1),
        color 300ms ease;
    }

    /*
     * OPEN STATE
     *
     * Khi mở:
     * Green -> Brand blue
     * + -> x
     */

    .quick-action-button.is-open {
      color: var(--color-brand);

      box-shadow:
        0 0 0 1px rgba(0, 59, 112, 0.06),
        0 8px 25px rgba(0, 59, 112, 0.18);
    }

    .quick-action-button.is-open .quick-action-icon {
      transform: rotate(45deg);
    }

    /*
     * ELECTRIC RING
     *
     * Vòng sáng chạy quanh nút.
     */

    .electric-ring {
      position: absolute;
      inset: -3px;

      z-index: 1;

      border-radius: inherit;

      pointer-events: none;

      opacity: 0;
    }

    /*
     * Green electric effect
     * khi chưa mở
     */

    .quick-action-button:not(.is-open) .electric-ring {
      background: conic-gradient(
        from 0deg,
        transparent 0deg,
        transparent 260deg,
        rgba(34, 197, 94, 0.15) 285deg,
        rgba(34, 197, 94, 0.95) 315deg,
        transparent 345deg,
        transparent 360deg
      );

      opacity: 1;

      animation: electric-spin 2.8s linear infinite;
    }

    /*
     * Khi active/open
     *
     * Electric chuyển sang màu brand
     */

    .quick-action-button.is-open .electric-ring {
      background: conic-gradient(
        from 0deg,
        transparent 0deg,
        transparent 245deg,
        rgba(0, 59, 112, 0.15) 275deg,
        rgba(0, 59, 112, 0.95) 315deg,
        transparent 350deg,
        transparent 360deg
      );

      opacity: 1;

      animation: electric-spin 1.6s linear infinite;
    }

    /*
     * Mask giúp hiệu ứng chỉ nằm ở viền
     */

    .electric-ring::after {
      content: "";

      position: absolute;
      inset: 2px;

      border-radius: inherit;

      background: white;
    }

    /*
     * Electric glow
     */

    .quick-action-button:not(.is-open) {
      filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.15));
    }

    .quick-action-button.is-open {
      filter: drop-shadow(0 0 7px rgba(0, 59, 112, 0.18));
    }

    /*
     * Hover
     */

    .quick-action-button:hover {
      color: #16a34a;

      box-shadow:
        0 0 0 1px rgba(34, 197, 94, 0.08),
        0 10px 30px rgba(34, 197, 94, 0.2);
    }

    .quick-action-button.is-open:hover {
      color: var(--color-brand);

      box-shadow:
        0 0 0 1px rgba(0, 59, 112, 0.08),
        0 10px 30px rgba(0, 59, 112, 0.2);
    }

    /* ========================================================= */
    /* BOTTOM SHEET ANIMATION                                    */
    /* ========================================================= */

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.98);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .animate-slide-up {
      animation: slideUp 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    /* ========================================================= */
    /* ELECTRIC ANIMATION                                        */
    /* ========================================================= */

    @keyframes electric-spin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }

    /* ========================================================= */
    /* FOCUS                                                     */
    /* ========================================================= */

    :host a:focus-visible,
    :host button:focus-visible {
      outline: 2px solid var(--color-text-primary);

      outline-offset: 3px;
    }

    /* ========================================================= */
    /* REDUCED MOTION                                            */
    /* ========================================================= */

    @media (prefers-reduced-motion: reduce) {
      .animate-slide-up,
      .electric-ring {
        animation: none !important;
      }

      .quick-action-icon,
      .quick-action-button,
      :host app-icon {
        transition: none !important;
      }
    }
  `,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNavigationComponent {
  private readonly authService = inject(AuthService);
  readonly languageService = inject(LanguageService);

  readonly isQuickActionsOpen = signal(false);

  readonly isMoreOpen = signal(false);

  /*
   * Quick Actions
   */

  readonly quickActions = [
    {
      key: "newSale",
      icon: "quick-sale",
      route: "/sales/new",
    },
    {
      key: "quickBill",
      icon: "bill",
      route: "/quick-bill",
    },
    {
      key: "newHandover",
      icon: "handover",
      route: "/handover/new",
    },
    {
      key: "newReport",
      icon: "report",
      route: "/reports/new",
    },
    {
      key: "newBooking",
      icon: "booking",
      route: "/booking/new",
    },
  ] as const;

  /*
   * Navigation items visible
   * for current authenticated user.
   *
   * Admin / Manager items are
   * controlled by roles in config.
   */

  readonly visibleNavigationItems = computed(() => {
    const user = this.authService.currentUser();

    if (!user) {
      return [];
    }

    const userRoles = (user.roles ?? []).map((role) => role.toUpperCase());

    return NAVIGATION_ITEMS.filter((item) => {
      if (!item.roles || item.roles.length === 0) {
        return true;
      }

      return item.roles.some((role) => userRoles.includes(role.toUpperCase()));
    });
  });

  /*
   * Mobile:
   *
   * Home
   * Handover
   */

  readonly primaryMobileNavigationItems = computed(() =>
    this.visibleNavigationItems().filter(
      (item) => item.route === "/" || item.route === "/handover",
    ),
  );

  /*
   * Mobile More:
   *
   * Inventory
   * Sales
   * Reports
   * Admin
   * Manager
   * ...
   *
   * Chỉ hiện những item
   * user có quyền.
   */

  readonly moreMenuItems = computed(() =>
    this.visibleNavigationItems().filter(
      (item) => item.route !== "/" && item.route !== "/handover",
    ),
  );

  /*
   * Desktop:
   *
   * Show all items allowed
   * by current user role.
   */

  readonly desktopNavigationItems = computed(() =>
    this.visibleNavigationItems(),
  );

  /*
   * Toggle Quick Actions
   */

  toggleQuickActions(): void {
    this.isQuickActionsOpen.update((value) => !value);

    this.isMoreOpen.set(false);
  }

  /*
   * Close Quick Actions
   */

  closeQuickActions(): void {
    this.isQuickActionsOpen.set(false);
  }

  /*
   * Toggle More
   */

  toggleMore(): void {
    this.isMoreOpen.update((value) => !value);

    this.isQuickActionsOpen.set(false);
  }

  /*
   * Close More
   */

  closeMore(): void {
    this.isMoreOpen.set(false);
  }
}
