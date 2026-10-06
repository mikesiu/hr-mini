import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';

export type VacationLedgerPdfRow = {
  pay_date?: string;
  gross_pay?: number;
  benefits?: number;
  vacation_paid?: number;
  vacation_percent?: number | null;
  vacation_amount_earned?: number;
  vacation_balance?: number;
  vacation_taken_days?: number;
  vacation_taken_dates?: string;
  vacation_balance_days?: number;
  sick_leave_taken_days?: number;
  sick_leave_taken_dates?: string;
  sick_leave_balance?: number;
  opening_balance?: number;
  employee_id?: string;
  employee_name?: string;
};

export type VacationLedgerEmployeeGroup = {
  employee_id: string;
  employee_name: string;
  rows: VacationLedgerPdfRow[];
};

function money(n: number | undefined | null): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(n || 0);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString();
    }
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

/** Safe filename segment from employee name / id */
export function sanitizeFilenamePart(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[^\w\s.-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80) || 'employee'
  );
}

export function vacationLedgerPdfFilename(
  employeeName: string,
  employeeId: string,
  year?: string | number
): string {
  const name = sanitizeFilenamePart(employeeName || 'Unknown');
  const id = sanitizeFilenamePart(employeeId || 'NA');
  const y = year ? `_${year}` : '';
  return `Vacation_Pay_Ledger_${name}_${id}${y}.pdf`;
}

export function buildVacationLedgerEmployeePdf(
  emp: VacationLedgerEmployeeGroup,
  opts: {
    companyLabel?: string;
    year?: string | number;
    generated?: string;
  } = {}
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const sorted = [...emp.rows].sort((a, b) =>
    String(a.pay_date || '').localeCompare(String(b.pay_date || ''))
  );
  const opening = sorted[0]?.opening_balance;
  const { companyLabel = '', year = '', generated = new Date().toLocaleDateString() } = opts;

  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text('VACATION PAY LEDGER', 10, 12);

  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.text(emp.employee_name || 'N/A', 10, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70);
  const metaParts = [
    emp.employee_id ? `ID: ${emp.employee_id}` : null,
    companyLabel || null,
    year ? `Year ${year}` : null,
    `${sorted.length} pay period${sorted.length === 1 ? '' : 's'}`,
    opening != null ? `Opening: ${money(Number(opening))}` : null,
  ].filter(Boolean);
  doc.text(metaParts.join('  ·  '), 10, 26);
  doc.text(`Generated ${generated}`, 10, 31);

  autoTable(doc, {
    startY: 34,
    head: [[
      'Pay Date',
      'Gross',
      'Benefits',
      'Vac Paid',
      'Vac %',
      'Vac Earned',
      'Vac Bal $',
      'Vac Taken',
      'Vac Dates',
      'Vac Bal Days',
      'Sick Taken',
      'Sick Dates',
      'Sick Bal',
    ]],
    body: sorted.map((row) => [
      formatDate(row.pay_date),
      money(row.gross_pay),
      money(row.benefits),
      money(row.vacation_paid),
      row.vacation_percent != null ? `${row.vacation_percent}%` : '',
      money(row.vacation_amount_earned),
      money(row.vacation_balance),
      String(row.vacation_taken_days?.toFixed?.(1) ?? row.vacation_taken_days ?? 0),
      row.vacation_taken_dates || '',
      String(row.vacation_balance_days?.toFixed?.(1) ?? row.vacation_balance_days ?? 0),
      String(row.sick_leave_taken_days?.toFixed?.(1) ?? row.sick_leave_taken_days ?? 0),
      row.sick_leave_taken_dates || '',
      String(row.sick_leave_balance?.toFixed?.(1) ?? row.sick_leave_balance ?? 0),
    ]),
    styles: {
      fontSize: 6.5,
      cellPadding: 1.1,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [232, 238, 242],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 18, halign: 'right' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 12, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 14, halign: 'right' },
      8: { cellWidth: 28 },
      9: { cellWidth: 16, halign: 'right' },
      10: { cellWidth: 14,halign: 'right' },
      11: { cellWidth: 24 },
      12: { cellWidth: 14,halign: 'right' },
    },
    margin: { left: 10, right: 10 },
    theme: 'grid',
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text('Confidential — for employee records', 10, pageHeight - 8);

  return doc;
}

/**
 * Build one PDF per employee and download them.
 * Single employee → one PDF file.
 * Multiple → ZIP containing individually named PDFs.
 */
export async function downloadVacationLedgerPdfsByEmployee(
  groups: VacationLedgerEmployeeGroup[],
  opts: {
    companyLabel?: string;
    year?: string | number;
    generated?: string;
  } = {}
): Promise<{ fileCount: number; zip: boolean; cancelled?: boolean }> {
  const { downloadBlobFile } = await import('./downloadFile');
  const sorted = [...groups].sort((a, b) =>
    a.employee_name.localeCompare(b.employee_name)
  );
  if (sorted.length === 0) {
    return { fileCount: 0, zip: false };
  }

  if (sorted.length === 1) {
    const emp = sorted[0];
    const doc = buildVacationLedgerEmployeePdf(emp, opts);
    const filename = vacationLedgerPdfFilename(emp.employee_name, emp.employee_id, opts.year);
    const ab = doc.output('arraybuffer');
    const result = await downloadBlobFile({
      filename,
      data: ab,
      mimeType: 'application/pdf',
    });
    if (result === 'cancelled') {
      return { fileCount: 0, zip: false, cancelled: true };
    }
    return { fileCount: 1, zip: false };
  }

  const zip = new JSZip();
  for (const emp of sorted) {
    const doc = buildVacationLedgerEmployeePdf(emp, opts);
    const filename = vacationLedgerPdfFilename(emp.employee_name, emp.employee_id, opts.year);
    const ab = doc.output('arraybuffer');
    zip.file(filename, ab);
  }

  const yearPart = opts.year ? `_${opts.year}` : '';
  const zipName = `Vacation_Pay_Ledger_by_employee${yearPart}.zip`;
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const result = await downloadBlobFile({
    filename: zipName,
    data: zipBlob,
    mimeType: 'application/zip',
  });
  if (result === 'cancelled') {
    return { fileCount: 0, zip: true, cancelled: true };
  }
  return { fileCount: sorted.length, zip: true };
}
