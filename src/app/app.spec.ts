import { provideHttpClient } from "@angular/common/http";
import { provideLocationMocks } from "@angular/common/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";

import { App } from "./app";
import { appRoutes } from "./app.config";

describe("App", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(appRoutes),
        provideLocationMocks(),
        provideHttpClient(),
      ],
    }).compileComponents();
  });

  it("should create the app", () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it("renders the login page at /login", async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl("/login");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain("Welcome back");
  });

  it("hides navigation on the login page", async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl("/login");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector("app-navigation")).toBeNull();
  });
});
