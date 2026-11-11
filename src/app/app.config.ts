import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import {
  provideClientHydration,
  withEventReplay,
} from "@angular/platform-browser";
import { provideRouter, type Routes } from "@angular/router";
import { requestContextInterceptor } from "@analogjs/router";
import { API_PREFIX } from "@analogjs/router/tokens";

import { adminGuard, authGuard } from "./core/auth/auth.guard";
import { authErrorInterceptor } from "./core/auth/auth.http-interceptor";

export const appRoutes: Routes = [
  {
    path: "login",
    loadComponent: () =>
      import("./features/(auth)/login/login.page").then((m) => m.default),
  },
  {
    path: "",
    loadComponent: () =>
      import("./pages/index/index.page").then((m) => m.default),
    canActivate: [authGuard],
  },
  {
    path: "admin",
    loadComponent: () =>
      import("./pages/admin/admin-page.component").then((m) => m.default),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: "handover",
    pathMatch: "full",
    loadComponent: () =>
      import("./pages/handover/handover.page").then((m) => m.default),
    canActivate: [authGuard],
  },
  {
    path: "handover/new",
    loadComponent: () =>
      import("./pages/handover/handover.page").then((m) => m.default),
    canActivate: [authGuard],
  },
  {
    path: "handover/:id",
    loadComponent: () =>
      import("./pages/handover/handover-task-detail.page").then(
        (m) => m.default,
      ),
    canActivate: [authGuard],
  },
  {
    path: "inventory",
    loadComponent: () =>
      import("./pages/inventory/inventory.page").then((m) => m.default),
    canActivate: [authGuard],
  },
  {
    path: "sales/new",
    loadComponent: () =>
      import("./pages/sales/sale.page").then((m) => m.default),
    canActivate: [authGuard],
  },
  {
    path: "sales",
    loadComponent: () =>
      import("./pages/sales/sales-history.page").then((m) => m.default),
    canActivate: [authGuard],
  },
  {
    path: "reports",
    pathMatch: "full",
    loadComponent: () =>
      import("./pages/reports/inventory-reports.page").then((m) => m.default),
    canActivate: [authGuard],
  },
  {
    path: "archive",
    loadComponent: () =>
      import("./pages/archive/archive.page").then((m) => m.default),
    canActivate: [authGuard],
  },
  {
    path: "reports/new",
    loadComponent: () =>
      import("./pages/reports/inventory-reports.page").then((m) => m.default),
    canActivate: [authGuard],
  },
  {
    path: "**",
    redirectTo: "",
  },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptors([requestContextInterceptor, authErrorInterceptor]),
    ),
    {
      provide: API_PREFIX,
      useValue: "api",
    },
    provideClientHydration(withEventReplay()),
  ],
};
