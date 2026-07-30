import { inject } from "@angular/core";

import { CanActivateFn, Router } from "@angular/router";

import { AuthService } from "./auth.service";
import { USER_ROLES } from "./auth.types";

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);

  const router = inject(Router);

  if (!authService.isInitialized()) {
    await authService.initialize();
  }

  /**
   * User is authenticated.
   *
   * Allow navigation.
   */
  if (authService.isAuthenticated()) {
    return true;
  }

  /**
   * User is not authenticated.
   *
   * Redirect to login.
   */
  return router.createUrlTree(["/login"]);
};

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);

  const router = inject(Router);

  if (!authService.isInitialized()) {
    await authService.initialize();
  }

  if (authService.hasAnyRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN])) {
    return true;
  }

  return router.createUrlTree(["/"]);
};
