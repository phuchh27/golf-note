import { inject } from "@angular/core";
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
} from "@angular/common/http";
import { Router } from "@angular/router";
import { catchError } from "rxjs/operators";
import { throwError } from "rxjs";

import { AuthService } from "./auth.service";
import { ToastService } from "../ui/toast.service";

export function authErrorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        authService.isAuthenticated()
      ) {
        authService.clearSession();
        toastService.warning("Phiên đã hết hạn. Vui lòng đăng nhập lại.");
        router.navigateByUrl("/login");
      }

      return throwError(() => error);
    }),
  );
}
