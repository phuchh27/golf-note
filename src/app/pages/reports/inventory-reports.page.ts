import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { LanguageService } from "../../core/i18n/language.service";
import { IconComponent } from "../../core/ui/icon/icon.component";
import { ToastService } from "../../core/ui/toast.service";

interface ShiftSchedule {
  code: string;
  labelVi: string;
  labelEn: string;
  startMinute: number;
  endMinute: number;
  sortOrder: number;
}

interface ReportItem {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  categoryCode: string;
  categoryName: string;
  inventoryGroup: "BEVERAGE" | "SUPPLIES";
  unit: string;
  quantity: number | string;
  previousQuantity?: number | string | null;
  change?: number | string | null;
  soldQuantity: number | string;
  receivedQuantity: number | string;
  adjustedIn: number | string;
  adjustedOut: number | string;
}

interface ReportSaleItem {
  id: string;
  sku: string;
  itemName: string;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
  totalPrice: number | string;
}

interface ReportSale {
  id: string;
  customerType: "ROOM" | "EXTERNAL";
  roomNumber?: string | null;
  customerName?: string | null;
  sellerName?: string | null;
  soldAt: string;
  totalAmount: number | string;
  items: ReportSaleItem[];
}

interface InventoryReport {
  id: string;
  reportDate: string;
  shiftCode: string;
  shiftLabel: string;
  startsAt: string;
  endsAt: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  note?: string | null;
  salesTotal?: number | string;
  changedItemCount?: number;
  _count?: { inventoryItems: number; sales: number };
  inventoryItems?: ReportItem[];
  sales?: ReportSale[];
}

interface MonthlySummaryItem {
  id: string;
  sku: string;
  name: string;
  status: string;
  unit: string;
  quantity: number;
  soldQuantity: number;
  soldRevenue: number;
  lots: Array<{
    id: string;
    batchCode?: string | null;
    producedAt?: string | null;
    expiresAt?: string | null;
    quantity: number;
  }>;
}

interface MonthlySummaryCategory {
  id: string;
  code: string;
  name: string;
  items: MonthlySummaryItem[];
}

interface MonthlySummarySale {
  id: string;
  soldAt: string;
  customerType: "ROOM" | "EXTERNAL";
  roomNumber?: string | null;
  customerName?: string | null;
  sellerName: string;
  totalAmount: number | string;
  items: Array<{
    id: string;
    sku: string;
    itemName: string;
    unit: string;
    quantity: number | string;
    expiresAt?: string | null;
    unitPrice: number | string;
    totalPrice: number | string;
  }>;
}

interface MonthlyInventorySummary {
  month: string;
  categoryCount: number;
  itemCount: number;
  transactionCount: number;
  soldQuantity: number;
  salesTotal: number;
  categories: MonthlySummaryCategory[];
  sales: MonthlySummarySale[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  statusMessage?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: "./inventory-reports.page.html",
})
export default class InventoryReportsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly languageService = inject(LanguageService);

  readonly schedules = signal<ShiftSchedule[]>([]);
  readonly reports = signal<InventoryReport[]>([]);
  readonly selectedReport = signal<InventoryReport | null>(null);
  readonly monthlySummary = signal<MonthlyInventorySummary | null>(null);
  readonly selectedMonth = signal(this.currentMonth());
  readonly selectedDate = signal(this.today());
  readonly selectedShift = signal("");
  readonly note = signal("");
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isDetailLoading = signal(false);
  readonly isMonthlyLoading = signal(false);
  readonly sumSales = (total: number, sale: ReportSale) =>
    total + Number(sale.totalAmount);

  readonly calendarDays = computed(() => {
    const [year, month] = this.selectedMonth().split("-").map(Number);
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const offset = (firstDay.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  });

  ngOnInit(): void {
    void this.loadSchedules();
    void this.loadMonth();
  }

  async loadSchedules(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ShiftSchedule[]>>(
          "/api/v1/inventory-reports/schedules",
          {
            withCredentials: true,
          },
        ),
      );
      this.schedules.set(response.data);
      if (!this.selectedShift() && response.data.length) {
        this.selectedShift.set(response.data[0].code);
      }
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tải cấu hình ca.",
      );
    }
  }

  async loadMonth(): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<InventoryReport[]>>(
          `/api/v1/inventory-reports?month=${this.selectedMonth()}`,
          { withCredentials: true },
        ),
      );
      this.reports.set(response.data);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tải lịch báo cáo kho.",
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async openMonthlySummary(): Promise<void> {
    this.isMonthlyLoading.set(true);
    this.monthlySummary.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<MonthlyInventorySummary>>(
          `/api/v1/inventory-reports/summary?month=${this.selectedMonth()}`,
          { withCredentials: true },
        ),
      );
      this.monthlySummary.set(response.data);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tải báo cáo chuyên sâu cuối tháng.",
      );
    } finally {
      this.isMonthlyLoading.set(false);
    }
  }

  closeMonthlySummary(): void {
    this.monthlySummary.set(null);
  }

  monthlyCustomerLabel(sale: MonthlySummarySale): string {
    if (sale.customerType === "ROOM") {
      return `${this.languageService.dictionary().inventoryReports.room} ${sale.roomNumber || "—"}`;
    }
    return sale.customerName || this.languageService.dictionary().inventoryReports.externalGuest;
  }

  async saveMonthlySummaryImage(): Promise<void> {
    const summary = this.monthlySummary();
    if (!summary) return;
    const labels = this.languageService.dictionary().inventoryReports;
    const language = this.languageService.language();
    const width = 1200;
    const lines: Array<{ text: string; size: number; color: string; weight: number; indent: number }> = [];
    const addLine = (text: string, size = 17, color = "#334155", weight = 400, indent = 0) =>
      lines.push({ text, size, color, weight, indent });
    addLine("GOLF NOTE", 25, "#0f766e", 700);
    addLine(`${labels.monthlyTitle} · ${summary.month}`, 26, "#111827", 700);
    addLine(`${labels.item}: ${summary.itemCount} · ${labels.transactions}: ${summary.transactionCount} · ${labels.sold}: ${summary.soldQuantity} · ${labels.revenue}: ${this.formatAmount(summary.salesTotal)}`, 16);
    for (const category of summary.categories) {
      addLine(`${labels.category}: ${category.name}`, 21, "#0f766e", 700);
      for (const item of category.items) {
        addLine(`${item.name} (${item.sku}) · ${labels.remainingQuantity}: ${item.quantity} ${item.unit} · ${labels.sold}: ${item.soldQuantity} ${item.unit} · ${labels.soldRevenue}: ${this.formatAmount(item.soldRevenue)}`, 16, "#1f2937", 700, 1);
        if (item.lots.length) {
          for (const lot of item.lots) {
            addLine(`HSD ${lot.expiresAt ? this.formatDate(lot.expiresAt, language) : "—"} · ${lot.batchCode || "Không mã lô"} · ${labels.remainingQuantity}: ${lot.quantity} ${item.unit}`, 14, "#64748b", 400, 2);
          }
        } else {
          addLine("Không theo dõi hạn sử dụng", 14, "#64748b", 400, 2);
        }
      }
    }
    addLine(labels.salesDetails, 21, "#0f766e", 700);
    for (const sale of summary.sales) {
      addLine(`${this.formatDateTime(sale.soldAt, language)} · ${this.monthlyCustomerLabel(sale)} · ${sale.sellerName || "—"} · ${this.formatAmount(sale.totalAmount)}`, 15, "#1f2937", 700);
      for (const line of sale.items) {
        addLine(`${line.itemName} × ${line.quantity} ${line.unit} · HSD ${line.expiresAt ? this.formatDate(line.expiresAt, language) : "—"} · ${this.formatAmount(line.totalPrice)}`, 14, "#64748b", 400, 1);
      }
    }
    const height = 60 + lines.reduce((sum, line) => sum + line.size + 15, 0) + 35;
    let y = 55;
    const svgLines = lines.map((line) => {
      y += line.size + 15;
      return `<text x="${55 + line.indent * 20}" y="${y}" font-family="Arial,sans-serif" font-size="${line.size}" font-weight="${line.weight}" fill="${line.color}">${this.escapeXml(line.text)}</text>`;
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f3efe6"/><rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="18" fill="#fffdf8" stroke="#ded6c9" stroke-width="2"/>${svgLines.join("")}</svg>`;
    try {
      const png = await this.svgToPng(svg, width, height);
      await this.shareOrDownloadImage(png, `inventory-monthly-report-${summary.month}.png`);
    } catch (error) {
      if (this.isShareCancelled(error)) return;
      console.error("Unable to save monthly inventory report image", error);
      this.toast.error(labels.imageDownloadFailed);
    }
  }

  private formatAmount(value: number | string): string {
    return Number(value).toLocaleString(
      this.languageService.language() === "vi" ? "vi-VN" : "en-US",
    );
  }

  private formatDate(value: string, language: "en" | "vi"): string {
    return new Date(value).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
    });
  }

  private formatDateTime(value: string, language: "en" | "vi"): string {
    return new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
      dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
    });
  }

  private escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!,
    );
  }

  private async svgToPng(svg: string, width: number, height: number): Promise<Blob> {
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const image = new Image();
      image.src = svgUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.drawImage(image, 0, 0);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to create PNG image")), "image/png");
      });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  private async shareOrDownloadImage(blob: Blob, fileName: string): Promise<void> {
    const labels = this.languageService.dictionary().inventoryReports;
    const file = new File([blob], fileName, { type: "image/png" });
    const shareNavigator = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    if (shareNavigator.share && shareNavigator.canShare?.({ files: [file] })) {
      try {
        await shareNavigator.share({ files: [file], title: labels.monthlyTitle });
        this.toast.success(labels.imageDownloaded);
        return;
      } catch (error) {
        if (this.isShareCancelled(error)) throw error;
        if (!(error instanceof DOMException) || error.name !== "NotAllowedError") {
          throw error;
        }
        // Some mobile browsers lose transient user activation while the PNG is rendered.
        // Fall back to a file download so the report is still available to the user.
      }
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    this.toast.success(labels.imageDownloaded);
  }

  private isShareCancelled(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
  }

  async moveMonth(offset: number): Promise<void> {
    const [year, month] = this.selectedMonth().split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1 + offset, 1));
    this.selectedMonth.set(
      `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    await this.loadMonth();
  }

  reportsForDay(day: number | null): InventoryReport[] {
    if (!day) return [];
    const dayKey = `${this.selectedMonth()}-${String(day).padStart(2, "0")}`;
    return this.reports().filter(
      (report) => this.reportDateKey(report.reportDate) === dayKey,
    );
  }

  async openReport(report: InventoryReport): Promise<void> {
    this.isDetailLoading.set(true);
    this.selectedReport.set(report);
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<InventoryReport>>(
          `/api/v1/inventory-reports/${report.id}`,
          { withCredentials: true },
        ),
      );
      this.selectedReport.set(response.data);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tải chi tiết báo cáo.",
      );
      this.selectedReport.set(null);
    } finally {
      this.isDetailLoading.set(false);
    }
  }

  async createReport(): Promise<void> {
    if (!this.selectedDate() || !this.selectedShift()) {
      this.toast.warning(
        this.languageService.dictionary().inventoryReports.selectDateShift,
      );
      return;
    }
    this.isSaving.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<InventoryReport>>(
          "/api/v1/inventory-reports",
          {
            reportDate: this.selectedDate(),
            shiftCode: this.selectedShift(),
            note: this.note().trim() || undefined,
          },
          { withCredentials: true },
        ),
      );
      this.note.set("");
      await this.loadMonth();
      await this.openReport(response.data);
      this.toast.success(
        this.languageService.dictionary().inventoryReports.created,
      );
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tạo báo cáo ca.",
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  closeReport(): void {
    this.selectedReport.set(null);
  }

  groupItems(group: "BEVERAGE" | "SUPPLIES"): ReportItem[] {
    return (this.selectedReport()?.inventoryItems ?? []).filter(
      (item) => item.inventoryGroup === group,
    );
  }

  customerLabel(sale: ReportSale): string {
    if (sale.customerType === "ROOM")
      return `${this.languageService.dictionary().inventoryReports.room} ${sale.roomNumber || "—"}`;
    return (
      sale.customerName ||
      this.languageService.dictionary().inventoryReports.externalGuest
    );
  }

  formatShiftTime(minute: number): string {
    return `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  }

  shiftName(code: string, label: string): string {
    const schedule = this.schedules().find((entry) => entry.code === code);
    if (!schedule) return label;
    return this.languageService.language() === "vi"
      ? schedule.labelVi
      : schedule.labelEn;
  }

  quantity(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  async downloadImage(): Promise<void> {
    const report = this.selectedReport();
    if (!report?.inventoryItems || !report.sales) return;
    const labels = this.languageService.dictionary().inventoryReports;
    const language = this.languageService.language();
    const escape = (value: unknown) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;",
          })[char]!,
      );
    const width = 900;
    const elements: string[] = [];
    let y = 60;
    const text = (
      value: string,
      options: {
        size?: number;
        color?: string;
        weight?: number;
        align?: "start" | "middle" | "end";
        x?: number;
      } = {},
    ) => {
      const x =
        options.x ??
        (options.align === "middle"
          ? width / 2
          : options.align === "end"
            ? width - 56
            : 56);
      elements.push(
        `<text x="${x}" y="${y}" text-anchor="${options.align ?? "start"}" font-family="Arial,sans-serif" font-size="${options.size ?? 18}" font-weight="${options.weight ?? 400}" fill="${options.color ?? "#263238"}">${escape(value)}</text>`,
      );
      y += (options.size ?? 18) + 12;
    };
    const separator = () => {
      elements.push(
        `<path d="M56 ${y - 4} H${width - 56}" stroke="#8b8172" stroke-width="2" stroke-dasharray="3 8"/>`,
      );
      y += 22;
    };
    const wrapped = (value: string, limit = 76): string[] => {
      const words = value.split(/\s+/);
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > limit && current) {
          lines.push(current);
          current = word;
        } else current = next;
      }
      if (current) lines.push(current);
      return lines;
    };
    const amount = (value: number | string) =>
      Number(value).toLocaleString(language === "vi" ? "vi-VN" : "en-US");
    const reportDate = new Date(
      `${this.reportDateKey(report.reportDate)}T12:00:00+07:00`,
    );
    const createdAt = new Date(report.createdAt);
    const dateText = reportDate.toLocaleDateString(
      language === "vi" ? "vi-VN" : "en-US",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      },
    );
    const createdText = createdAt.toLocaleString(
      language === "vi" ? "vi-VN" : "en-US",
      {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      },
    );
    const shift = this.shiftName(report.shiftCode, report.shiftLabel);
    const salesTotal = report.sales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0,
    );

    text("GOLF NOTE", {
      size: 24,
      color: "#0f766e",
      weight: 700,
      align: "middle",
    });
    text(
      labels.title.toLocaleUpperCase(language === "vi" ? "vi-VN" : "en-US"),
      { size: 27, color: "#111827", weight: 700, align: "middle" },
    );
    text(`${shift} · ${dateText}`, {
      size: 20,
      color: "#334155",
      weight: 700,
      align: "middle",
    });
    text("SHIFT INVENTORY CHECK", {
      size: 13,
      color: "#64748b",
      align: "middle",
    });
    separator();
    text(`${labels.creator}: ${report.creatorName}`, { size: 16 });
    text(`${labels.createdAt}: ${createdText}`, { size: 16 });
    text(
      `${new Date(report.startsAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} – ${new Date(report.endsAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}`,
      { size: 16 },
    );
    separator();

    text(labels.salesSection.replace(/^\d+\.\s*/, ""), {
      size: 20,
      color: "#0f766e",
      weight: 700,
    });
    text(`${labels.transactions}: ${report.sales.length}`, { size: 16 });
    for (const sale of report.sales) {
      text(
        `${new Date(sale.soldAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} · ${this.customerLabel(sale)}`,
        { size: 15, weight: 700 },
      );
      for (const item of sale.items) {
        elements.push(
          `<text x="76" y="${y}" font-family="Arial,sans-serif" font-size="15" fill="#475569">${escape(`${item.itemName} × ${item.quantity} ${item.unit}`)}</text>`,
        );
        elements.push(
          `<text x="${width - 56}" y="${y}" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#475569">${escape(amount(item.totalPrice))}</text>`,
        );
        y += 25;
      }
      text(`${labels.seller}: ${sale.sellerName || "—"}`, {
        size: 13,
        color: "#64748b",
      });
    }
    if (!report.sales.length)
      text(labels.noSales, { size: 15, color: "#64748b" });
    elements.push(`<path d="M520 ${y - 5} H${width - 56}" stroke="#cbd5e1"/>`);
    y += 19;
    elements.push(
      `<text x="56" y="${y}" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#111827">${escape(labels.revenue)}</text>`,
    );
    elements.push(
      `<text x="${width - 56}" y="${y}" text-anchor="end" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#111827">${escape(amount(salesTotal))}</text>`,
    );
    y += 34;
    separator();

    const inventorySection = (
      title: string,
      group: "BEVERAGE" | "SUPPLIES",
    ) => {
      text(title.replace(/^\w\.\s*/, ""), {
        size: 20,
        color: group === "BEVERAGE" ? "#0369a1" : "#7c3aed",
        weight: 700,
      });
      const groupItems = this.groupItems(group);
      if (!groupItems.length)
        text(labels.noItems, { size: 15, color: "#64748b" });
      for (const item of groupItems) {
        elements.push(
          `<text x="56" y="${y}" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#263238">${escape(item.name)}</text>`,
        );
        elements.push(
          `<text x="${width - 56}" y="${y}" text-anchor="end" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#263238">${escape(`${item.quantity} ${item.unit}`)}</text>`,
        );
        y += 23;
        const delta =
          item.change == null
            ? "—"
            : `${Number(item.change) > 0 ? "+" : ""}${item.change}`;
        text(
          `${item.sku} · ${item.previousQuantity == null ? "—" : item.previousQuantity} → ${item.quantity} (${delta})`,
          { size: 13, color: "#64748b", x: 76 },
        );
      }
      separator();
    };
    inventorySection(labels.beverages, "BEVERAGE");
    inventorySection(labels.supplies, "SUPPLIES");

    text(labels.note, { size: 18, weight: 700 });
    for (const row of wrapped(report.note || labels.noNote, 78)) {
      text(row, { size: 15, color: "#475569", x: 76 });
    }
    separator();
    text("— END OF SHIFT REPORT —", {
      size: 13,
      color: "#64748b",
      align: "middle",
    });
    text("Golf Note · Inventory", {
      size: 12,
      color: "#94a3b8",
      align: "middle",
    });

    const height = y + 35;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f3efe6"/><path d="M30 24 H${width - 30} Q${width - 20} 24 ${width - 20} 34 V${height - 34} Q${width - 20} ${height - 24} ${width - 30} ${height - 24} H30 Q20 ${height - 24} 20 ${height - 34} V34 Q20 24 30 24Z" fill="#fffdf8" stroke="#ded6c9" stroke-width="2"/>${elements.join("")}</svg>`;

    try {
      const png = await this.svgToPng(svg, width, height);
      await this.shareOrDownloadImage(
        png,
        `inventory-report-${this.reportDateKey(report.reportDate)}-${report.shiftCode.toLowerCase()}.png`,
      );
    } catch (error) {
      if (this.isShareCancelled(error)) return;
      console.error("Unable to download inventory report image", error);
      this.toast.error(
        this.languageService.dictionary().inventoryReports.imageDownloadFailed,
      );
    }
  }

  private reportDateKey(value: string): string {
    return value.slice(0, 10);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private currentMonth(): string {
    return this.today().slice(0, 7);
  }
}
