import * as XLSX from 'xlsx';

export function exportToCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportToXlsx(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportReportAsPng(
  filename: string,
  title: string,
  subtitle: string,
  kpis: Array<{ label: string; value: string }>,
  rows: Array<{ label: string; value: string }>
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0B1120';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header accent bar
  ctx.fillStyle = '#1D4ED8';
  ctx.fillRect(0, 0, canvas.width, 8);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(0, 0, 260, 8);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, 56, 72);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '18px "DM Sans", sans-serif';
  ctx.fillText(subtitle, 56, 108);

  // KPI grid
  const cardW = 250;
  kpis.slice(0, 4).forEach((kpi, idx) => {
    const x = 56 + idx * (cardW + 28);
    const y = 148;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(x, y, cardW, 118);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(x, y, cardW, 118);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px "DM Sans", sans-serif';
    ctx.fillText(kpi.label, x + 20, y + 36);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.fillText(kpi.value, x + 20, y + 84);
  });

  // Breakdown rows
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Detalhe de Indicadores', 56, 320);

  rows.slice(0, 6).forEach((row, i) => {
    const y = 362 + i * 44;
    ctx.fillStyle = i % 2 === 0 ? '#111827' : '#0F172A';
    ctx.fillRect(56, y - 26, 1088, 38);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '16px "DM Sans", sans-serif';
    ctx.fillText(row.label, 76, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText(row.value, 940, y);
  });

  ctx.fillStyle = '#64748B';
  ctx.font = '13px "DM Sans", sans-serif';
  ctx.fillText('Gerado por AIVAD — Driver Intelligence & Management Ecosystem', 56, 646);

  canvas.toBlob((blob) => {
    if (blob) {
      triggerDownload(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
    }
  }, 'image/png');
}

export function exportPrintablePdfReport(
  title: string,
  subtitle: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  const html = `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
  h1 { color: #1d4ed8; margin-bottom: 4px; }
  p { color: #475569; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background: #eff6ff; color: #1e3a8a; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(subtitle)}</p>
  <table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(String(h))}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows
        .map(
          (r) =>
            `<tr>${r.map((c) => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-pdf-ready.html`);
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
