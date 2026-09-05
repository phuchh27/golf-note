import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import {
  provideClientHydration,
  withEventReplay,
} from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { requestContextInterceptor } from "@analogjs/router";
import { API_PREFIX } from "@analogjs/router/tokens";

import { adminGuard, authGuard } from "./core/auth/auth.guard";
import { authErrorInterceptor } from "./core/auth/auth.http-interceptor";

export const appRoutes = [
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
