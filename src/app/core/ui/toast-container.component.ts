import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';

import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [],

  template: `
    <div
      class="
        pointer-events-none
        fixed
        inset-x-4
        top-4
        z-[100]
        flex
        flex-col
        items-end
        gap-3

        sm:inset-x-auto
        sm:right-6
        sm:top-6
        sm:w-[380px]
      "
    >
      @for (
        toast of toastService.toasts();
        track toast.id
      ) {
        <div
          class="
            toast-card
            pointer-events-auto
            relative
            w-full
            overflow-hidden
            rounded-2xl
            border
            p-4
            backdrop-blur-2xl
            backdrop-saturate-150
            shadow-[var(--shadow-lg)]
          "

          [class.toast-success]="
            toast.type === 'success'
          "

          [class.toast-error]="
            toast.type === 'error'
          "

          [class.toast-info]="
            toast.type === 'info'
          "

          [class.toast-warning]="
            toast.type === 'warning'
          "
        >

          <!-- Glass Highlight -->

          <div
            class="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-br
              from-white/30
              via-white/5
              to-transparent
              dark:from-white/10
              dark:via-white/[0.02]
              dark:to-transparent
            "
          ></div>


          <!-- Content -->

          <div
            class="
              relative
              flex
              items-start
              gap-3
            "
          >

            <!-- Icon -->

            <div
              class="
                toast-icon
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                text-sm
                font-semibold
              "
            >

              @if (
                toast.type === 'success'
              ) {
                <span>✓</span>
              }

              @if (
                toast.type === 'error'
              ) {
                <span>!</span>
              }

              @if (
                toast.type === 'info'
              ) {
                <span>i</span>
              }

              @if (
                toast.type === 'warning'
              ) {
                <span>!</span>
              }

            </div>


            <!-- Message -->

            <div
              class="
                min-w-0
                flex-1
                pt-0.5
              "
            >

              <p
                class="
                  text-sm
                  font-semibold
                  leading-5
                  text-[var(--color-text-primary)]
                "
              >
                {{ toast.type }}
              </p>

              <p
                class="
                  mt-1
                  text-sm
                  leading-5
                  text-[var(--color-text-secondary)]
                "
              >
                {{ toast.message }}
              </p>

            </div>


            <!-- Close -->

            <button
              type="button"

              class="
                -mr-1
                -mt-1
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-full
                text-[var(--color-text-muted)]
                transition-all
                duration-200

                hover:bg-black/5
                hover:text-[var(--color-text-primary)]

                dark:hover:bg-white/10
              "

              aria-label="Close notification"

              (click)="
                toastService.remove(
                  toast.id
                )
              "
            >
              <span
                class="
                  text-lg
                  leading-none
                "
              >
                ×
              </span>
            </button>

          </div>


          <!-- Progress -->

          <div
            class="
              toast-progress
              absolute
              bottom-0
              left-0
              h-[2px]
              w-full
            "
          ></div>

        </div>
      }
    </div>
  `,

  styles: [
    `
      /* =====================================================
         LIQUID GLASS
      ===================================================== */

      .toast-card {
        position: relative;

        background:
          linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.72),
            rgba(255, 255, 255, 0.42)
          );

        border-color:
          rgba(255, 255, 255, 0.65);

        box-shadow:
          0 20px 60px
          rgba(15, 23, 42, 0.12),

          inset 0 1px 0
          rgba(255, 255, 255, 0.7);

        /*
         * Enter animation
         */

        animation:
          toast-enter
          300ms
          cubic-bezier(
            0.2,
            0.8,
            0.2,
            1
          )
          both;
      }


      /* =====================================================
         HOVER
      ===================================================== */

      .toast-card:hover {
        transform:
          translateY(-2px);

        transition:
          transform
          180ms
          ease;
      }


      /* =====================================================
         DARK MODE
      ===================================================== */

      :host-context(.dark)
      .toast-card {

        background:
          linear-gradient(
            135deg,
            rgba(24, 35, 46, 0.78),
            rgba(24, 35, 46, 0.58)
          );

        border-color:
          rgba(255, 255, 255, 0.1);

        box-shadow:
          0 20px 60px
          rgba(0, 0, 0, 0.35),

          inset 0 1px 0
          rgba(255, 255, 255, 0.08);
      }


      /* =====================================================
         PROGRESS BAR
      ===================================================== */

      .toast-progress {

        animation:
          toast-progress
          2000ms
          linear
          forwards;

      }


      /* =====================================================
         SUCCESS
      ===================================================== */

      .toast-success {
        border-color:
          rgba(31, 143, 95, 0.25);
      }

      .toast-success
      .toast-icon {

        color:
          var(--color-success);

        background:
          rgba(31, 143, 95, 0.1);

        border-color:
          rgba(31, 143, 95, 0.2);
      }

      .toast-success
      .toast-progress {

        background:
          var(--color-success);

        box-shadow:
          0 0 16px
          rgba(31, 143, 95, 0.35);
      }


      /* =====================================================
         ERROR
      ===================================================== */

      .toast-error {
        border-color:
          rgba(201, 67, 67, 0.25);
      }

      .toast-error
      .toast-icon {

        color:
          var(--color-danger);

        background:
          rgba(201, 67, 67, 0.1);

        border-color:
          rgba(201, 67, 67, 0.2);
      }

      .toast-error
      .toast-progress {

        background:
          var(--color-danger);

        box-shadow:
          0 0 16px
          rgba(201, 67, 67, 0.35);
      }


      /* =====================================================
         INFO
      ===================================================== */

      .toast-info {
        border-color:
          rgba(40, 120, 181, 0.25);
      }

      .toast-info
      .toast-icon {

        color:
          var(--color-info);

        background:
          rgba(40, 120, 181, 0.1);

        border-color:
          rgba(40, 120, 181, 0.2);
      }

      .toast-info
      .toast-progress {

        background:
          var(--color-info);

        box-shadow:
          0 0 16px
          rgba(40, 120, 181, 0.35);
      }


      /* =====================================================
         WARNING
      ===================================================== */

      .toast-warning {
        border-color:
          rgba(217, 139, 24, 0.25);
      }

      .toast-warning
      .toast-icon {

        color:
          var(--color-warning);

        background:
          rgba(217, 139, 24, 0.1);

        border-color:
          rgba(217, 139, 24, 0.2);
      }

      .toast-warning
      .toast-progress {

        background:
          var(--color-warning);

        box-shadow:
          0 0 16px
          rgba(217, 139, 24, 0.35);
      }


      /* =====================================================
         ENTER ANIMATION
      ===================================================== */

      @keyframes toast-enter {

        0% {

          opacity: 0;

          transform:
            translateX(24px)
            translateY(-8px)
            scale(0.94);

          filter:
            blur(4px);
        }

        60% {

          opacity: 1;

          transform:
            translateX(-4px)
            translateY(0)
            scale(1.01);

          filter:
            blur(0);
        }

        100% {

          opacity: 1;

          transform:
            translateX(0)
            translateY(0)
            scale(1);

        }

      }


      /* =====================================================
         PROGRESS ANIMATION
      ===================================================== */

      @keyframes toast-progress {

        from {
          transform:
            scaleX(1);

          transform-origin:
            left;
        }

        to {
          transform:
            scaleX(0);

          transform-origin:
            left;
        }

      }


      /* =====================================================
         MOBILE
      ===================================================== */

      @media (
        max-width: 640px
      ) {

        .toast-card {

          border-radius:
            var(--radius-xl);

          animation-duration:
            250ms;
        }

      }


      /* =====================================================
         REDUCED MOTION
      ===================================================== */

      @media (
        prefers-reduced-motion: reduce
      ) {

        .toast-card,
        .toast-progress {

          animation:
            none;

        }

      }
    `,
  ],

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {

  readonly toastService =
    inject(ToastService);

}