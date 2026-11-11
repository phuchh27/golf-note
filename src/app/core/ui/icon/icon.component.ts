import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from "@angular/core";

import { NgIcon, provideIcons } from "@ng-icons/core";

import {
  lucideHome,
  lucideArrowLeftRight,
  lucidePackage,
  lucideChartNoAxesColumn,
  lucideFileText,
  lucideShieldUser,
  lucideUserRound,
  lucidePlus,
  lucideCalendarDays,
  lucideReceiptText,
  lucideShoppingCart,
  lucideEllipsis,
  lucideZap,
  lucideSettings2,
  lucideUser,
  lucideLogOut,
  lucideSun,
  lucideMoon,
  lucideGlobe,
  lucideBell,
  lucideChevronDown,
  lucideClockFading,
  lucideClipboardList,
  lucideArchive
} from "@ng-icons/lucide";

import { IconName } from "./icon.types";

@Component({
  selector: "app-icon",
  standalone: true,
  imports: [NgIcon],

  providers: [
    provideIcons({
      lucideHome,
      lucideArrowLeftRight,
      lucidePackage,
      lucideChartNoAxesColumn,
      lucideFileText,
      lucideShieldUser,
      lucideUserRound,
      lucidePlus,
      lucideCalendarDays,
      lucideReceiptText,
      lucideShoppingCart,
      lucideEllipsis,
      lucideSettings2,
      lucideZap,
      lucideUser,
      lucideLogOut,
      lucideSun,
      lucideMoon,
      lucideGlobe,
      lucideBell,
      lucideChevronDown,
      lucideClockFading,
      lucideClipboardList,
      lucideArchive
    }),
  ],

  template: `
    <span
      class="gn-icon"
      [class.gn-icon-active]="active"
      [style.width.px]="size"
      [style.height.px]="size"
    >
      <ng-icon
        [name]="iconName"
        [size]="size.toString()"
        [strokeWidth]="active ? '2.2' : '1.8'"
      />
    </span>
  `,

  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-secondary);
      }

      .gn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;

        color: inherit;
        background: transparent;

        transition:
          color 180ms ease,
          transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
      }

      .gn-icon ng-icon {
        display: flex;
        align-items: center;
        justify-content: center;

        transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
      }

      /*
     * Chỉ active khi component được truyền [active]="true".
     *
     * Navigation hiện tại không cần dùng trạng thái này.
     */

      :host(.is-active) {
        color: var(--color-text-primary);
      }

      :host(.is-active) .gn-icon {
        transform: scale(1.04);
      }

      :host(.is-active) .gn-icon ng-icon {
        transform: scale(1.03);
      }

      /*
     * Hover
     */

      :host(:not(.is-active)) .gn-icon:hover {
        color: var(--color-text-primary);
        transform: translateY(-1px);
      }

      /*
     * Dark mode
     */

      :host-context(.dark) {
        color: var(--color-text-secondary);
      }

      :host-context(.dark).is-active {
        color: var(--color-text-primary);
      }

      /*
     * Reduced motion
     */

      @media (prefers-reduced-motion: reduce) {
        .gn-icon,
        .gn-icon ng-icon {
          transition: none !important;
        }
      }
    `,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @Input({
    required: true,
  })
  name!: IconName;

  @Input()
  active = false;

  @Input()
  size = 24;

  @HostBinding("class.is-active")
  get isActive(): boolean {
    return this.active;
  }

  get iconName(): string {
    return ICON_MAP[this.name] ?? "lucideHome";
  }
}

/**
 * Application icon mapping
 */
const ICON_MAP: Record<IconName, string> = {
  home: "lucideHome",

  handover: "lucideArrowLeftRight",

  inventory: "lucidePackage",

  sales: "lucideChartNoAxesColumn",

  report: "lucideFileText",

  admin: "lucideShieldUser",

  manager: "lucideUserRound",

  plus: "lucideZap",

  booking: "lucideCalendarDays",

  bill: "lucideReceiptText",

  "quick-sale": "lucideShoppingCart",

  more: "lucideEllipsis",

  settings: "lucideSettings2",
  user: "lucideUser",
  logout: "lucideLogOut",
  theme: "lucideSun",
  language: "lucideGlobe",
  notification: "lucideBell",
  "chevron-down": "lucideChevronDown",
  clock: "lucideClockFading",
  task:"lucideClipboardList",
  archive: "lucideArchive"
};
