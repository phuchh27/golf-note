import { inject } from '@angular/core';

import { AuthService } from './auth.service';

export function initializeAuth() {
  const authService =
    inject(AuthService);

  return authService.initialize();
}