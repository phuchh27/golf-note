import { Component } from "@angular/core";

import { DashboardHeaderComponent } from "../../core/layout/dashboard-header/dashboard-header.component";
import { DashboardWelcomeComponent } from "../../core/layout/dashboard-welcome/dashboard-welcome.component";
import { DashboardOverviewComponent } from "../../core/layout/dashboard-hero/dashboard-overview.component";
@Component({
  selector: "app-dashboard-page",
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    DashboardWelcomeComponent,
    DashboardOverviewComponent
  ],
  template: `
    <main
      class="
        mx-auto
        flex
        max-w-7xl
        flex-col
        gap-8
        px-5
        py-6
        lg:px-8
      "
    >
      <app-dashboard-header />


      <app-dashboard-overview />
    </main>
  `,
})
export default class DashboardPage {}