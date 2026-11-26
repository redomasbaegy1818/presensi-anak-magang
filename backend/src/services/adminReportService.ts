import type { AttendanceStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';
import { findAttendanceReportSource } from '../repositories/attendanceRepository.js';
import { AppError } from '../utils/appError.js';
import { getWibDateTimeParts } from '../utils/dateWib.js';
import type { AdminReportQuery } from '../validation/adminSchemas.js';

export type ReportType = AdminReportQuery['reportType'];
export type ExportFormat = 'xlsx' | 'pdf';

export interface ReportGroupedRow {
  key: string;
  label: string;
  secondaryLabel: string;
  participantCount: number;
  expectedDays: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  totalAttendance: number;
  totalRecords: number;
  attendancePercentage: number;
}

export interface ReportDetailRow {
  id: string;
  participantId: string;
  participantName: string;
  nimNis: string;
  division: string;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  isCorrected: boolean;
}

export interface AdminAttendanceReportResponse {
  filters: {
    reportType: ReportType;
    startDate: string;
    endDate: string;
    participantId: string;
    division: string;
    status: 'ALL' | AttendanceStatus;
  };
  summary: {
    totalRecords: number;
    totalAttendance: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    uniqueParticipants: number;
    attendancePercentage: number;
  };
  groupedRows: ReportGroupedRow[];
  detailRows: ReportDetailRow[];
  filterOptions: {
    participants: {
      id: string;
      fullName: string;
      nimNis: string;
      division: string;
    }[];
    divisions: string[];
  };
  generatedAt: string;
}

const MONTH_LABELS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const WIB_TIME_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: env.OFFICE_TIMEZONE,
});

const WIB_DATETIME_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: env.OFFICE_TIMEZONE,
});

function toIsoDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(dateStr: string, deltaDays: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return toIsoDateStr(date);
}

function getMondayOfWeek(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffToMonday);
  return toIsoDateStr(date);
}

function getEndOfMonth(dateStr: string): string {
  const [yStr, mStr] = dateStr.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const lastDay = new Date(Date.UTC(year, month, 0));
  return toIsoDateStr(lastDay);
}

function resolveReportDateRange(
  reportType: ReportType,
  rawStart?: string,
  rawEnd?: string,
  now: Date = new Date(),
): { startDate: string; endDate: string; todayStr: string } {
  const todayStr = getWibDateTimeParts(now, env.OFFICE_TIMEZONE).dateStr;
  const startInput = rawStart?.trim() || '';
  const endInput = rawEnd?.trim() || '';

  if (startInput && endInput) {
    return { startDate: startInput, endDate: endInput, todayStr };
  }

  if (startInput && !endInput) {
    if (reportType === 'daily') {
      return { startDate: startInput, endDate: startInput, todayStr };
    }
    if (reportType === 'weekly') {
      return {
        startDate: startInput,
        endDate: addDaysUtc(startInput, 6),
        todayStr,
      };
    }
    return {
      startDate: startInput,
      endDate: getEndOfMonth(startInput),
      todayStr,
    };
  }

  if (!startInput && endInput) {
    if (reportType === 'daily') {
      return { startDate: endInput, endDate: endInput, todayStr };
    }
    if (reportType === 'weekly') {
      return {
        startDate: getMondayOfWeek(endInput),
        endDate: endInput,
        todayStr,
      };
    }
    return {
      startDate: `${endInput.slice(0, 7)}-01`,
      endDate: endInput,
      todayStr,
    };
  }

  if (reportType === 'daily') {
    return { startDate: todayStr, endDate: todayStr, todayStr };
  }
  if (reportType === 'weekly') {
    const monday = getMondayOfWeek(todayStr);
    return { startDate: monday, endDate: addDaysUtc(monday, 6), todayStr };
  }
  return {
    startDate: `${todayStr.slice(0, 7)}-01`,
    endDate: getEndOfMonth(todayStr),
    todayStr,
  };
}

function computeEffectiveEnd(
  rangeStart: string,
  rangeEnd: string,
  todayStr: string,
): string {
  // Clamp ongoing period to today so future days in the current week/month don't deflate rate,
  // while leaving explicitly queried future ranges intact.
  if (rangeStart <= todayStr && rangeEnd > todayStr) {
    return todayStr;
  }
  return rangeEnd;
}

function countWeekdaysInOverlap(
  rangeStart: string,
  rangeEnd: string,
  clipStart: string,
  clipEnd: string,
): number {
  const start = rangeStart > clipStart ? rangeStart : clipStart;
  const end = rangeEnd < clipEnd ? rangeEnd : clipEnd;
  if (end < start) return 0;

  let cursor = new Date(`${start}T00:00:00.000Z`);
  const endMs = Date.parse(`${end}T00:00:00.000Z`);
  let count = 0;

  while (cursor.getTime() <= endMs) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor = new Date(cursor.getTime() + 86_400_000);
  }

  return count;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return SHORT_DATE_FORMATTER.format(d);
}

function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const monthIdx = Number(mStr) - 1;
  const monthName = MONTH_LABELS_ID[monthIdx] ?? mStr;
  return `${monthName} ${yStr}`;
}

function formatStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT':
      return 'Hadir';
    case 'LATE':
      return 'Terlambat';
    case 'ABSENT':
      return 'Tidak Hadir';
  }
}

function formatReportTypeLabel(reportType: ReportType): string {
  switch (reportType) {
    case 'daily':
      return 'Harian';
    case 'weekly':
      return 'Mingguan';
    case 'monthly':
      return 'Bulanan';
    case 'participant':
      return 'Per Peserta';
  }
}

function formatWibTime(isoString: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return `${WIB_TIME_FORMATTER.format(date).replace('.', ':')} WIB`;
}

function computePercentage(
  totalAttendance: number,
  totalRecords: number,
  expectedDays: number,
  statusFilter: 'ALL' | AttendanceStatus,
): number {
  const denominator =
    statusFilter === 'ALL' && expectedDays > 0
      ? Math.max(totalRecords, expectedDays)
      : totalRecords;
  if (denominator <= 0) return 0;
  return Math.min(100, roundOneDecimal((totalAttendance / denominator) * 100));
}

export async function getAdminAttendanceReport(
  query: AdminReportQuery,
): Promise<AdminAttendanceReportResponse> {
  const { startDate, endDate, todayStr } = resolveReportDateRange(
    query.reportType,
    query.startDate,
    query.endDate,
  );

  if (endDate < startDate) {
    throw AppError.badRequest(
      'Tanggal akhir tidak boleh lebih awal dari tanggal mulai.',
      'INVALID_DATE_RANGE',
      { endDate: ['Tanggal akhir tidak boleh lebih awal dari tanggal mulai.'] },
    );
  }

  const participantIdFilter = query.participantId?.trim() || 'ALL';
  const divisionFilter = query.division?.trim() || 'ALL';
  const statusFilter = query.status;

  const { attendances, participantsInScope, allParticipants } =
    await findAttendanceReportSource({
      startDate,
      endDate,
      participantId: participantIdFilter,
      division: divisionFilter,
      status: statusFilter,
    });

  const divisions = Array.from(
    new Set(
      allParticipants
        .map((p) => p.division.trim())
        .filter((d) => d.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, 'id'));

  const detailRows: ReportDetailRow[] = attendances.map((row) => ({
    id: row.id,
    participantId: row.participantId,
    participantName: row.participant.fullName,
    nimNis: row.participant.nimNis,
    division: row.participant.division,
    attendanceDate: toIsoDateStr(row.attendanceDate),
    checkInAt: row.checkInAt?.toISOString() ?? null,
    checkOutAt: row.checkOutAt?.toISOString() ?? null,
    status: row.status,
    isCorrected: row.isCorrected,
  }));

  const effectiveEnd = computeEffectiveEnd(startDate, endDate, todayStr);

  // Active participants overlapping the query range (or participants who actually have records)
  const attendedParticipantIds = new Set(detailRows.map((r) => r.participantId));
  const relevantParticipants = participantsInScope.filter((p) => {
    if (attendedParticipantIds.has(p.id)) return true;
    if (statusFilter !== 'ALL' || p.status !== 'ACTIVE') return false;
    const pStart = toIsoDateStr(p.internshipStartDate);
    const pEnd = toIsoDateStr(p.internshipEndDate);
    return pStart <= endDate && pEnd >= startDate;
  });

  const presentCount = detailRows.filter((r) => r.status === 'PRESENT').length;
  const lateCount = detailRows.filter((r) => r.status === 'LATE').length;
  const absentCount = detailRows.filter((r) => r.status === 'ABSENT').length;
  const totalAttendance = presentCount + lateCount;
  const totalRecords = detailRows.length;

  let totalExpectedSlots = 0;
  if (statusFilter === 'ALL') {
    for (const p of relevantParticipants) {
      totalExpectedSlots += countWeekdaysInOverlap(
        startDate,
        effectiveEnd,
        toIsoDateStr(p.internshipStartDate),
        toIsoDateStr(p.internshipEndDate),
      );
    }
  }

  const groupedRows: ReportGroupedRow[] = [];

  if (query.reportType === 'participant') {
    const byParticipant = new Map<string, ReportDetailRow[]>();
    for (const row of detailRows) {
      const list = byParticipant.get(row.participantId);
      if (list) list.push(row);
      else byParticipant.set(row.participantId, [row]);
    }

    for (const p of relevantParticipants) {
      const rows = byParticipant.get(p.id) ?? [];
      const pPresent = rows.filter((r) => r.status === 'PRESENT').length;
      const pLate = rows.filter((r) => r.status === 'LATE').length;
      const pAbsent = rows.filter((r) => r.status === 'ABSENT').length;
      const pTotalAtt = pPresent + pLate;
      const pTotalRec = rows.length;
      const expectedDays =
        statusFilter === 'ALL'
          ? countWeekdaysInOverlap(
              startDate,
              effectiveEnd,
              toIsoDateStr(p.internshipStartDate),
              toIsoDateStr(p.internshipEndDate),
            )
          : pTotalRec;

      groupedRows.push({
        key: p.id,
        label: p.fullName,
        secondaryLabel: `${p.nimNis} • ${p.division}`,
        participantCount: 1,
        expectedDays,
        presentCount: pPresent,
        lateCount: pLate,
        absentCount: pAbsent,
        totalAttendance: pTotalAtt,
        totalRecords: pTotalRec,
        attendancePercentage: computePercentage(
          pTotalAtt,
          pTotalRec,
          expectedDays,
          statusFilter,
        ),
      });
    }
  } else {
    interface PeriodBucket {
      key: string;
      label: string;
      secondaryLabel: string;
      bucketStart: string;
      bucketEnd: string;
      rows: ReportDetailRow[];
    }

    const buckets = new Map<string, PeriodBucket>();

    for (const row of detailRows) {
      let key: string;
      let label: string;
      let secondaryLabel: string;
      let bucketStart: string;
      let bucketEnd: string;

      if (query.reportType === 'daily') {
        key = row.attendanceDate;
        label = formatDateShort(row.attendanceDate);
        secondaryLabel = 'Harian';
        bucketStart = row.attendanceDate;
        bucketEnd = row.attendanceDate;
      } else if (query.reportType === 'weekly') {
        const monday = getMondayOfWeek(row.attendanceDate);
        const sunday = addDaysUtc(monday, 6);
        bucketStart = monday < startDate ? startDate : monday;
        bucketEnd = sunday > endDate ? endDate : sunday;
        key = monday;
        label = `${formatDateShort(bucketStart)} – ${formatDateShort(bucketEnd)}`;
        secondaryLabel = 'Mingguan';
      } else {
        const monthKey = row.attendanceDate.slice(0, 7);
        const monthStart = `${monthKey}-01`;
        const monthEnd = getEndOfMonth(monthStart);
        bucketStart = monthStart < startDate ? startDate : monthStart;
        bucketEnd = monthEnd > endDate ? endDate : monthEnd;
        key = monthKey;
        label = formatMonthLabel(monthKey);
        secondaryLabel = `${formatDateShort(bucketStart)} – ${formatDateShort(bucketEnd)}`;
      }

      const existing = buckets.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        buckets.set(key, {
          key,
          label,
          secondaryLabel,
          bucketStart,
          bucketEnd,
          rows: [row],
        });
      }
    }

    const sortedBuckets = Array.from(buckets.values()).sort((a, b) =>
      a.key.localeCompare(b.key),
    );

    for (const bucket of sortedBuckets) {
      const pPresent = bucket.rows.filter((r) => r.status === 'PRESENT').length;
      const pLate = bucket.rows.filter((r) => r.status === 'LATE').length;
      const pAbsent = bucket.rows.filter((r) => r.status === 'ABSENT').length;
      const pTotalAtt = pPresent + pLate;
      const pTotalRec = bucket.rows.length;
      const uniqueInBucket = new Set(bucket.rows.map((r) => r.participantId))
        .size;

      let expectedDays = pTotalRec;
      if (statusFilter === 'ALL') {
        const effectiveBucketEnd = computeEffectiveEnd(
          bucket.bucketStart,
          bucket.bucketEnd,
          todayStr,
        );
        let bucketSlots = 0;
        for (const p of relevantParticipants) {
          bucketSlots += countWeekdaysInOverlap(
            bucket.bucketStart,
            effectiveBucketEnd,
            toIsoDateStr(p.internshipStartDate),
            toIsoDateStr(p.internshipEndDate),
          );
        }
        expectedDays = bucketSlots;
      }

      groupedRows.push({
        key: bucket.key,
        label: bucket.label,
        secondaryLabel: bucket.secondaryLabel,
        participantCount: uniqueInBucket,
        expectedDays,
        presentCount: pPresent,
        lateCount: pLate,
        absentCount: pAbsent,
        totalAttendance: pTotalAtt,
        totalRecords: pTotalRec,
        attendancePercentage: computePercentage(
          pTotalAtt,
          pTotalRec,
          expectedDays,
          statusFilter,
        ),
      });
    }
  }

  return {
    filters: {
      reportType: query.reportType,
      startDate,
      endDate,
      participantId: participantIdFilter,
      division: divisionFilter,
      status: statusFilter,
    },
    summary: {
      totalRecords,
      totalAttendance,
      presentCount,
      lateCount,
      absentCount,
      uniqueParticipants: attendedParticipantIds.size,
      attendancePercentage: computePercentage(
        totalAttendance,
        totalRecords,
        totalExpectedSlots,
        statusFilter,
      ),
    },
    groupedRows,
    detailRows,
    filterOptions: {
      participants: allParticipants,
      divisions,
    },
    generatedAt: new Date().toISOString(),
  };
}

function buildFilterDescriptor(report: AdminAttendanceReportResponse): {
  participantLabel: string;
  statusLabel: string;
  divisionLabel: string;
  generatedLabel: string;
} {
  const participantMatch = report.filterOptions.participants.find(
    (p) => p.id === report.filters.participantId,
  );
  const participantLabel =
    report.filters.participantId === 'ALL'
      ? 'Semua Peserta'
      : participantMatch
        ? `${participantMatch.fullName} (${participantMatch.nimNis})`
        : report.filters.participantId;

  const statusLabel =
    report.filters.status === 'ALL'
      ? 'Semua Status'
      : formatStatusLabel(report.filters.status);

  const divisionLabel =
    report.filters.division === 'ALL'
      ? 'Semua Divisi'
      : report.filters.division;

  const generatedLabel = `${WIB_DATETIME_FORMATTER.format(new Date(report.generatedAt)).replace('.', ':')} WIB`;

  return {
    participantLabel,
    statusLabel,
    divisionLabel,
    generatedLabel,
  };
}

async function generateExcelBuffer(
  report: AdminAttendanceReportResponse,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Presensi Peserta Magang';
  workbook.created = new Date(report.generatedAt);

  const meta = buildFilterDescriptor(report);

  // Sheet 1: Ringkasan
  const summarySheet = workbook.addWorksheet('Ringkasan Laporan');
  summarySheet.views = [{ showGridLines: true }];

  summarySheet.addRow(['LAPORAN KEHADIRAN PESERTA MAGANG']);
  summarySheet.getRow(1).font = { bold: true, size: 14 };
  summarySheet.addRow([
    'Jenis Laporan',
    formatReportTypeLabel(report.filters.reportType),
  ]);
  summarySheet.addRow([
    'Periode Tanggal',
    `${formatDateShort(report.filters.startDate)} – ${formatDateShort(report.filters.endDate)}`,
  ]);
  summarySheet.addRow(['Divisi', meta.divisionLabel]);
  summarySheet.addRow(['Peserta', meta.participantLabel]);
  summarySheet.addRow(['Filter Status', meta.statusLabel]);
  summarySheet.addRow(['Dicetak Pada', meta.generatedLabel]);
  summarySheet.addRow([]);

  summarySheet.addRow(['RINGKASAN KESELURUHAN']);
  summarySheet.getRow(9).font = { bold: true, size: 11 };
  summarySheet.addRow(['Total Kehadiran (Hadir + Terlambat)', report.summary.totalAttendance]);
  summarySheet.addRow(['Hadir Tepat Waktu', report.summary.presentCount]);
  summarySheet.addRow(['Terlambat', report.summary.lateCount]);
  summarySheet.addRow(['Tidak Hadir', report.summary.absentCount]);
  summarySheet.addRow(['Total Catatan Presensi', report.summary.totalRecords]);
  summarySheet.addRow(['Persentase Kehadiran (%)', `${report.summary.attendancePercentage}%`]);
  summarySheet.addRow([]);

  const groupHeaderLabel =
    report.filters.reportType === 'participant' ? 'Peserta' : 'Periode';
  const groupSecondaryLabel =
    report.filters.reportType === 'participant' ? 'NIM/NIS & Divisi' : 'Cakupan';

  const groupHeaderRow = summarySheet.addRow([
    'No',
    groupHeaderLabel,
    groupSecondaryLabel,
    'Hadir',
    'Terlambat',
    'Tidak Hadir',
    'Total Kehadiran',
    'Persentase (%)',
  ]);
  groupHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  groupHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
  });

  if (report.groupedRows.length === 0) {
    summarySheet.addRow(['—', 'Tidak ada data rekapitulasi yang sesuai filter.', '', 0, 0, 0, 0, '0%']);
  } else {
    report.groupedRows.forEach((row, index) => {
      summarySheet.addRow([
        index + 1,
        row.label,
        row.secondaryLabel,
        row.presentCount,
        row.lateCount,
        row.absentCount,
        row.totalAttendance,
        `${row.attendancePercentage}%`,
      ]);
    });
  }

  summarySheet.columns = [
    { width: 28 },
    { width: 32 },
    { width: 28 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 18 },
    { width: 16 },
  ];

  // Sheet 2: Detail Presensi
  const detailSheet = workbook.addWorksheet('Detail Presensi');
  const detailHeader = detailSheet.addRow([
    'No',
    'Tanggal',
    'Nama Peserta',
    'NIM/NIS',
    'Divisi',
    'Jam Masuk (WIB)',
    'Jam Pulang (WIB)',
    'Status',
    'Koreksi Admin',
  ]);
  detailHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  detailHeader.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
  });

  if (report.detailRows.length === 0) {
    detailSheet.addRow([
      '—',
      '—',
      'Tidak ada catatan presensi yang sesuai filter.',
      '—',
      '—',
      '—',
      '—',
      '—',
      '—',
    ]);
  } else {
    report.detailRows.forEach((row, index) => {
      detailSheet.addRow([
        index + 1,
        formatDateShort(row.attendanceDate),
        row.participantName,
        row.nimNis,
        row.division,
        formatWibTime(row.checkInAt),
        formatWibTime(row.checkOutAt),
        formatStatusLabel(row.status),
        row.isCorrected ? 'Ya' : 'Tidak',
      ]);
    });
  }

  detailSheet.columns = [
    { width: 6 },
    { width: 16 },
    { width: 28 },
    { width: 16 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 15 },
    { width: 15 },
  ];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

interface PdfColumnDef {
  header: string;
  width: number;
  align?: 'left' | 'right';
}

function drawPdfTable(
  doc: PDFKit.PDFDocument,
  columns: PdfColumnDef[],
  rows: string[][],
  emptyText: string,
) {
  const startX = doc.page.margins.left;
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  const rowHeight = 20;

  const drawHeader = (yPos: number) => {
    let x = startX;
    doc.save();
    doc
      .rect(
        startX,
        yPos,
        columns.reduce((sum, c) => sum + c.width, 0),
        rowHeight,
      )
      .fill('#1E293B');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
    for (const col of columns) {
      doc.text(col.header, x + 5, yPos + 6, {
        width: col.width - 10,
        align: col.align ?? 'left',
        lineBreak: false,
        ellipsis: true,
      });
      x += col.width;
    }
    doc.restore();
    return yPos + rowHeight;
  };

  let y = doc.y;
  if (y + rowHeight * 2 > pageBottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  y = drawHeader(y);

  if (rows.length === 0) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text(emptyText, startX + 4, y + 6);
    doc.y = y + 26;
    return;
  }

  for (let i = 0; i < rows.length; i += 1) {
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = drawHeader(doc.page.margins.top);
    }

    const row = rows[i] ?? [];
    const totalW = columns.reduce((sum, c) => sum + c.width, 0);
    if (i % 2 === 1) {
      doc.save();
      doc.rect(startX, y, totalW, rowHeight).fill('#F8FAFC');
      doc.restore();
    }

    doc.save();
    doc
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + totalW, y + rowHeight)
      .lineWidth(0.5)
      .strokeColor('#E2E8F0')
      .stroke();
    doc.restore();

    let x = startX;
    doc.font('Helvetica').fontSize(8.5).fillColor('#0F172A');
    for (let cIdx = 0; cIdx < columns.length; cIdx += 1) {
      const col = columns[cIdx]!;
      const text = row[cIdx] ?? '—';
      doc.text(text, x + 5, y + 6, {
        width: col.width - 10,
        align: col.align ?? 'left',
        lineBreak: false,
        ellipsis: true,
      });
      x += col.width;
    }

    y += rowHeight;
  }

  doc.y = y + 12;
}

async function generatePdfBuffer(
  report: AdminAttendanceReportResponse,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      info: {
        Title: 'Laporan Kehadiran Peserta Magang',
        Author: 'Sistem Presensi Magang',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const meta = buildFilterDescriptor(report);

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#0F172A')
      .text('Laporan Kehadiran Peserta Magang');
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor('#475569')
      .text(
        `Jenis: ${formatReportTypeLabel(report.filters.reportType)}  |  Periode: ${formatDateShort(report.filters.startDate)} – ${formatDateShort(report.filters.endDate)}  |  Divisi: ${meta.divisionLabel}`,
      )
      .text(
        `Peserta: ${meta.participantLabel}  |  Status: ${meta.statusLabel}  |  Dicetak: ${meta.generatedLabel}`,
      );

    doc.moveDown(0.75);

    const summaryText = `Total Kehadiran: ${report.summary.totalAttendance}   |   Hadir Tepat Waktu: ${report.summary.presentCount}   |   Terlambat: ${report.summary.lateCount}   |   Tidak Hadir: ${report.summary.absentCount}   |   Persentase Kehadiran: ${report.summary.attendancePercentage}%`;
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#0F172A')
      .text(summaryText);

    doc.moveDown(0.75);

    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor('#0F172A')
      .text('Rekapitulasi Kehadiran');
    doc.moveDown(0.35);

    const groupColumns: PdfColumnDef[] = [
      { header: 'No', width: 32, align: 'right' },
      {
        header:
          report.filters.reportType === 'participant'
            ? 'Nama Peserta'
            : 'Periode',
        width: 210,
      },
      {
        header:
          report.filters.reportType === 'participant'
            ? 'NIM/NIS & Divisi'
            : 'Cakupan',
        width: 198,
      },
      { header: 'Hadir', width: 65, align: 'right' },
      { header: 'Terlambat', width: 68, align: 'right' },
      { header: 'Absen', width: 60, align: 'right' },
      { header: 'Total Hadir', width: 72, align: 'right' },
      { header: 'Persentase', width: 65, align: 'right' },
    ];

    const groupedTableRows = report.groupedRows.map((row, idx) => [
      String(idx + 1),
      row.label,
      row.secondaryLabel,
      String(row.presentCount),
      String(row.lateCount),
      String(row.absentCount),
      String(row.totalAttendance),
      `${row.attendancePercentage}%`,
    ]);

    drawPdfTable(
      doc,
      groupColumns,
      groupedTableRows,
      'Tidak ada data rekapitulasi yang sesuai filter.',
    );

    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor('#0F172A')
      .text('Detail Catatan Presensi', doc.page.margins.left, doc.y);
    doc.moveDown(0.35);

    const detailColumns: PdfColumnDef[] = [
      { header: 'No', width: 32, align: 'right' },
      { header: 'Tanggal', width: 88 },
      { header: 'Nama Peserta', width: 175 },
      { header: 'NIM/NIS', width: 95 },
      { header: 'Divisi', width: 120 },
      { header: 'Masuk', width: 72 },
      { header: 'Pulang', width: 72 },
      { header: 'Status', width: 116 },
    ];

    const detailTableRows = report.detailRows.map((row, idx) => [
      String(idx + 1),
      formatDateShort(row.attendanceDate),
      row.participantName,
      row.nimNis,
      row.division,
      formatWibTime(row.checkInAt),
      formatWibTime(row.checkOutAt),
      row.isCorrected
        ? `${formatStatusLabel(row.status)} (Koreksi)`
        : formatStatusLabel(row.status),
    ]);

    drawPdfTable(
      doc,
      detailColumns,
      detailTableRows,
      'Tidak ada catatan presensi yang sesuai filter.',
    );

    doc.end();
  });
}

export async function exportAdminAttendanceReport(
  query: AdminReportQuery,
  format: ExportFormat,
): Promise<{
  buffer: Buffer;
  mimeType: string;
  filename: string;
}> {
  const report = await getAdminAttendanceReport(query);
  const safeBase = `laporan-presensi-${report.filters.reportType}-${report.filters.startDate}_${report.filters.endDate}`;

  if (format === 'xlsx') {
    const buffer = await generateExcelBuffer(report);
    return {
      buffer,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${safeBase}.xlsx`,
    };
  }

  const buffer = await generatePdfBuffer(report);
  return {
    buffer,
    mimeType: 'application/pdf',
    filename: `${safeBase}.pdf`,
  };
}
