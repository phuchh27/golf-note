import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "../../auth/auth.service";
import { UserMenuComponent } from "./user-menu.component";

describe("UserMenuComponent", () => {
  let fixture: ComponentFixture<UserMenuComponent>;
  let component: UserMenuComponent;
  let authService: {
    logout: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof signal<unknown | null>>;
  };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      logout: vi.fn().mockResolvedValue(undefined),
      currentUser: signal(null),
    };

    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;
  });

  it("redirects to login after logout", async () => {
    await component.logout();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith("/login");
  });
});
