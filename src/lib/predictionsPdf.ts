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

function formatMatchDate(date: string) {
  return new Date(date).toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderFlagHtml(code: string, teamName: string) {
  const flagUrl = getCountryFlagSvgUrl(code);
  if (flagUrl) {
    return `<img class="flag-img" src="${flagUrl}" alt="${escapeHtml(teamName)}" />`;
  }

  return `<span class="flag-fallback">${escapeHtml(getCountryFlagFallback(code))}</span>`;
}

export function buildPredictionsPdfHtml(options: BuildPredictionsPdfOptions) {
  const rows = [...options.rows].sort(
    (a, b) => new Date(a.match.match_date).getTime() - new Date(b.match.match_date).getTime(),
  );
  const splitIndex = Math.ceil(rows.length / 2);
  const leftRows = rows.slice(0, splitIndex);
  const rightRows = rows.slice(splitIndex);
  const generatedLabel = options.generatedAt.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const userMeta = options.userLabel
    ? `<span>Jugador: <strong>${escapeHtml(options.userLabel)}</strong></span>`
    : '';

  function buildColumnRows(columnRows: PredictionPrintableRow[], offset: number) {
    return columnRows
      .map(
        ({ match, homeScore, awayScore }, index) => `
      <tr>
        <td class="idx">${offset + index + 1}</td>
        <td class="grp">${escapeHtml(match.group_name)}</td>
        <td class="team">${renderFlagHtml(match.home_team_code, match.home_team)} ${escapeHtml(match.home_team)}</td>
        <td class="score">${homeScore}-${awayScore}</td>
        <td class="team team-away">${escapeHtml(match.away_team)} ${renderFlagHtml(match.away_team_code, match.away_team)}</td>
      </tr>
    `,
      )
      .join('');
  }

  const leftTableRowsHtml = buildColumnRows(leftRows, 0);
  const rightTableRowsHtml = buildColumnRows(rightRows, splitIndex);

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Quiniela Oficial - ${escapeHtml(options.poolName)}</title>
        <style>
          :root {
            --ink: #102046;
            --ink-soft: #4b5678;
            --paper: #ffffff;
            --line: #d7deee;
            --head: #0f2558;
            --head-soft: #eef3ff;
            --score-bg: #112a63;
            --accent: #0b8c7a;
            --accent-soft: #e8faf6;
          }

          @page { size: A4 portrait; margin: 6mm; }

          * { box-sizing: border-box; }
          html, body { width: 100%; }
          body {
            margin: 0;
            font-family: "Trebuchet MS", "Segoe UI", sans-serif;
            color: var(--ink);
            background: var(--paper);
          }

          .sheet {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            border: 1px solid #c7d3ee;
            border-radius: 10px;
            padding: 8px;
            background:
              linear-gradient(145deg, #ffffff 0%, #fbfdff 100%);
          }

          .hero {
            border: 1px solid #b8c8ea;
            border-radius: 10px;
            padding: 8px 10px;
            background:
              linear-gradient(135deg, rgba(15, 37, 88, 0.98), rgba(35, 91, 164, 0.96));
            color: var(--head);
          }

          .hero h1 {
            margin: 0;
            font-size: 16px;
            letter-spacing: 0.2px;
            color: #ffffff;
          }

          .hero p {
            margin: 3px 0 0;
            color: #dbe8ff;
            font-size: 10px;
          }

          .hero-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 5px 10px;
            margin-top: 6px;
            font-size: 9px;
            color: #e6eeff;
          }

          .columns {
            margin-top: 8px;
            display: table;
            width: 100%;
            table-layout: fixed;
            border-spacing: 6px 0;
          }

          .column {
            display: table-cell;
            vertical-align: top;
            width: 50%;
          }

          .column-title {
            font-size: 8px;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            background: var(--accent-soft);
            color: #0b6b5f;
            border: 1px solid #bde6dd;
            border-bottom: 0;
            border-radius: 7px 7px 0 0;
            padding: 4px 6px;
            font-weight: 800;
          }

          .sheet-table {
            width: 100%;
            border: 1px solid var(--line);
            border-top: 0;
            border-collapse: collapse;
            table-layout: fixed;
            border-radius: 0 0 7px 7px;
            overflow: hidden;
          }

          .sheet-table th {
            background: #f8faff;
            color: var(--ink-soft);
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            padding: 4px 3px;
            text-align: left;
            border-bottom: 1px solid var(--line);
          }

          .sheet-table thead th {
            background: #f5f8ff;
          }

          .sheet-table td {
            border-bottom: 1px solid var(--line);
            padding: 2px 3px;
            vertical-align: middle;
            font-size: 9px;
            line-height: 1.1;
          }

          .sheet-table tr:last-child td {
            border-bottom: 0;
          }

          .idx {
            text-align: center;
            width: 6%;
            color: var(--ink-soft);
          }

          .grp {
            text-align: center;
            width: 9%;
            color: #1a6b61;
            font-weight: 700;
          }

          .team {
            font-weight: 700;
            width: 36%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .flag-img {
            width: 12px;
            height: 8px;
            border-radius: 1px;
            border: 0.4px solid #cfdaf1;
            vertical-align: baseline;
            margin-right: 3px;
            margin-left: 3px;
          }

          .flag-fallback {
            margin-right: 3px;
            margin-left: 3px;
          }

          .team-away {
            text-align: right;
          }

          .score {
            text-align: center;
            width: 13%;
            font-size: 9px;
            font-weight: 800;
            color: #fff;
            background: linear-gradient(135deg, var(--score-bg), #173d87);
            border-radius: 999px;
            letter-spacing: 0.4px;
            padding: 2px 0;
            white-space: nowrap;
          }

          .footer {
            margin-top: 8px;
            display: block;
            font-size: 8px;
            color: #6e7894;
            text-align: left;
          }

          @media print {
            html, body {
              background: #fff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .sheet {
              border-color: #b9c9ea;
              border-radius: 8px;
              background: #fff;
            }

            .hero {
              background: #173d87 !important;
              border-color: #173d87;
            }

            .hero h1,
            .hero p,
            .hero-meta {
              color: #ffffff !important;
            }

            .column-title {
              background: #e8faf6 !important;
              color: #0b6b5f !important;
              border-color: #bde6dd;
            }

            .score {
              background: #173d87 !important;
              color: #fff !important;
              border: 1px solid #173d87;
            }

            .sheet-table th {
              background: #f3f7ff !important;
              color: #314264 !important;
            }
          }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header class="hero">
            <h1>Quiniela Oficial</h1>
            <p>${escapeHtml(options.poolName)}</p>
            <div class="hero-meta">
              <span>Partidos: <strong>${options.rows.length}</strong></span>
              ${userMeta}
              <span>Generado: <strong>${escapeHtml(generatedLabel)}</strong></span>
            </div>
          </header>

          <div class="columns">
            <section class="column">
              <div class="column-title">Columna 1</div>
              <table class="sheet-table" cellspacing="0" cellpadding="0">
                <thead>
                  <tr>
                    <th style="width: 6%; text-align:center;">#</th>
                    <th style="width: 9%; text-align:center;">G</th>
                    <th style="width: 36%;">Local</th>
                    <th style="width: 13%; text-align:center;">Score</th>
                    <th style="width: 36%; text-align:right;">Visitante</th>
                  </tr>
                </thead>
                <tbody>
                  ${leftTableRowsHtml}
                </tbody>
              </table>
            </section>

            <section class="column">
              <div class="column-title">Columna 2</div>
              <table class="sheet-table" cellspacing="0" cellpadding="0">
                <thead>
                  <tr>
                    <th style="width: 6%; text-align:center;">#</th>
                    <th style="width: 9%; text-align:center;">G</th>
                    <th style="width: 36%;">Local</th>
                    <th style="width: 13%; text-align:center;">Score</th>
                    <th style="width: 36%; text-align:right;">Visitante</th>
                  </tr>
                </thead>
                <tbody>
                  ${rightTableRowsHtml}
                </tbody>
              </table>
            </section>
          </div>

          <div class="footer">
            <span>Mundial Quiniela</span>
          </div>
        </main>
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