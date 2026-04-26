import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getCountryFlagFallback, getCountryFlagSvgUrl } from '@/lib/flags';
import type { Match } from '@/types';

export interface PredictionPrintableRow {
  match: Match;
  homeScore: number;
  awayScore: number;
}

interface BuildPredictionsPdfOptions {
  poolName: string;
  generatedAt: Date;
  userLabel?: string;
  rows: PredictionPrintableRow[];
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatMatchTime(dateString: string) {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace('.', '');
  const time = date.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `<span class="date-day">${day} ${month}</span><br/><span class="date-time">${time}</span>`;
}

function renderFlagHtml(code: string, teamName: string) {
  const flagUrl = getCountryFlagSvgUrl(code);
  if (flagUrl) {
    return `<img class="flag-img" src="${flagUrl}" alt="${escapeHtml(teamName)}" />`;
  }
  return `<span class="flag-fallback">${escapeHtml(getCountryFlagFallback(code))}</span>`;
}

export function buildPredictionsPdfHtml(options: BuildPredictionsPdfOptions) {
  // Ordenar por Grupo y luego Fecha
  const rows = [...options.rows].sort((a, b) => {
    if (a.match.group_name !== b.match.group_name) {
      return a.match.group_name.localeCompare(b.match.group_name);
    }
    return new Date(a.match.match_date).getTime() - new Date(b.match.match_date).getTime();
  });
  
  const splitIndex = Math.ceil(rows.length / 2);
  const leftRows = rows.slice(0, splitIndex);
  const rightRows = rows.slice(splitIndex);
  
  const generatedLabel = options.generatedAt.toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  function buildColumnRows(columnRows: PredictionPrintableRow[], offset: number) {
    let currentGroup = '';
    return columnRows
      .map(({ match, homeScore, awayScore }, index) => {
        let groupHeader = '';
        if (match.group_name !== currentGroup) {
          currentGroup = match.group_name;
          groupHeader = `
            <tr class="group-header-row">
              <td colspan="5">GRUPO ${escapeHtml(currentGroup)}</td>
            </tr>
          `;
        }
        
        return `
          ${groupHeader}
          <tr>
            <td class="col-idx">${offset + index + 1}</td>
            <td class="col-date">${formatMatchTime(match.match_date)}</td>
            <td class="team-cell team-home">
              <span class="team-name">${escapeHtml(match.home_team)}</span>
              ${renderFlagHtml(match.home_team_code, match.home_team)}
            </td>
            <td class="col-score"><span class="score-badge">${homeScore}-${awayScore}</span></td>
            <td class="team-cell team-away">
              ${renderFlagHtml(match.away_team_code, match.away_team)}
              <span class="team-name">${escapeHtml(match.away_team)}</span>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Quiniela - ${escapeHtml(options.poolName)}</title>
        <style>
          :root {
            --primary: #0A6B35;
            --primary-dark: #084D26;
            --accent: #C9A84C;
            --navy: #0D1B2A;
            --border: #D9E3EE;
            --text: #0D1B2A;
            --text-muted: #556B82;
          }

          @page { size: A4 portrait; margin: 4mm; }

          * { box-sizing: border-box; }
          body {
            font-family: "Segoe UI", Tahoma, sans-serif;
            color: var(--text);
            margin: 0; padding: 0;
            background: #fff;
            -webkit-print-color-adjust: exact;
          }

          .container { width: 100%; }

          /* --- HEADER --- */
          .hero {
            background-color: var(--primary-dark);
            border-radius: 6px;
            padding: 8px 12px;
            color: white;
            border-bottom: 3px solid var(--accent);
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .hero h1 { margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; color: var(--accent); }
          .hero h2 { margin: 0; font-size: 11px; font-weight: 700; color: #fff; }
          .hero-meta { display: flex; gap: 10px; font-size: 8px; }
          .meta-item { text-align: right; }
          .meta-label { font-weight: 800; color: var(--accent); text-transform: uppercase; display: block; }
          .meta-value { font-weight: 700; color: #fff; }

          /* --- COLUMNS --- */
          .columns { display: flex; gap: 6px; }
          .column { flex: 1; }

          .sheet-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--border);
            table-layout: fixed;
          }

          /* --- GROUP SUB-HEADER --- */
          .group-header-row td {
            background: var(--navy) !important;
            color: var(--accent) !important;
            font-size: 7.5px !important;
            font-weight: 900 !important;
            text-transform: uppercase;
            padding: 2px 6px !important;
            letter-spacing: 0.5px;
            text-align: left;
            border: 0 !important;
          }

          .sheet-table td {
            padding: 1px 2px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 8px;
            vertical-align: middle;
            height: 17px;
          }

          .sheet-table tr:nth-child(even):not(.group-header-row) { background-color: #fafbfc; }

          .col-idx { width: 14px; color: var(--text-muted); font-size: 6.5px; text-align: center; }
          .col-date { width: 32px; text-align: center; color: var(--text-muted); line-height: 1; }
          .date-day { font-size: 6px; font-weight: 800; text-transform: uppercase; }
          .date-time { font-size: 7.5px; font-weight: 600; color: var(--text); }
          .col-score { width: 34px; text-align: center; }

          .team-cell {
            display: flex;
            align-items: center;
            gap: 2.5px;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
          }
          .team-home { justify-content: flex-end; text-align: right; }
          .team-away { justify-content: flex-start; text-align: left; }

          .team-name { overflow: hidden; text-overflow: ellipsis; max-width: 65px; }

          .score-badge {
            display: inline-block;
            background: var(--navy);
            color: #fff;
            font-weight: 900;
            padding: 1px 3px;
            border-radius: 2px;
            min-width: 28px;
            font-size: 8px;
          }

          .flag-img { width: 11px; height: 7.5px; border-radius: 1px; border: 0.2px solid var(--border); }

          .footer {
            margin-top: 4px;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            font-size: 7px;
            color: var(--text-muted);
            padding-top: 2px;
          }

          @media print {
            .hero { background-color: #084D26 !important; }
            .group-header-row td { background-color: #0D1B2A !important; }
            .score-badge { background-color: #0D1B2A !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header class="hero">
            <div>
              <h1>Mundial Quiniela 2026</h1>
              <h2>${escapeHtml(options.poolName)}</h2>
            </div>
            <div class="hero-meta">
              <div class="meta-item">
                <span class="meta-label">Jugador</span>
                <span class="meta-value">${escapeHtml(options.userLabel || 'Invitado')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Emitido</span>
                <span class="meta-value">${escapeHtml(generatedLabel)}</span>
              </div>
            </div>
          </header>

          <div class="columns">
            <div class="column">
              <table class="sheet-table">
                <tbody>
                  ${buildColumnRows(leftRows, 0)}
                </tbody>
              </table>
            </div>

            <div class="column">
              <table class="sheet-table">
                <tbody>
                  ${buildColumnRows(rightRows, splitIndex)}
                </tbody>
              </table>
            </div>
          </div>

          <footer class="footer">
            <span>Official FIFA World Cup 2026 Edition — Digital Receipt</span>
            <span>${options.rows.length} pronósticos registrados</span>
          </footer>
        </div>
      </body>
    </html>
  `;
}

interface ExportPredictionsPdfOptions extends BuildPredictionsPdfOptions {}

export async function exportPredictionsPdf(options: ExportPredictionsPdfOptions) {
  const html = buildPredictionsPdfHtml(options);

  if (Platform.OS === 'web') {
    const popup = window.open('', '_blank', 'width=1024,height=900');
    if (!popup) throw new Error('No se pudo abrir la ventana de impresión.');

    popup.document.open();
    popup.document.write(html);
    popup.document.close();

    await new Promise<void>(resolve => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        setTimeout(resolve, 250);
      };

      if (popup.document.readyState === 'complete') done();
      popup.addEventListener('load', done, { once: true });
      setTimeout(done, 1200);
    });

    popup.focus();
    popup.print();
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Exportar quiniela en PDF',
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  await Print.printAsync({ uri });
}