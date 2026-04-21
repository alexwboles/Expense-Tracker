/* ═══════════════════════════════════════════════
   REPORTS.JS — Reporting Engine & Excel Export
   Boles West Run Ranch — Expense Tracker

   Report Types:
   1. Expense Summary (totals, averages, stats)
   2. By Category (operational breakdown)
   3. By Vendor (top vendors)
   4. Monthly Breakdown (12-month grid)
   5. Year-over-Year Comparison
   6. Schedule F Tax Report (IRS-ready)

   Export: Multi-sheet Excel workbooks via SheetJS
   ═══════════════════════════════════════════════ */

const REPORTS = (() => {

  // ─── CHART INSTANCES (for cleanup) ───
  let activeCharts = {};

  // ═══════════════════════════════════════════════
  //  REPORT GENERATION — DISPATCHER
  // ═══════════════════════════════════════════════

  /**
   * Generate a report by type
   * @param {string} type - 'summary', 'category', 'vendor', 'monthly', 'comparison'
   * @param {Object} options - { year, dateStart, dateEnd, compareYear }
   * @returns {Object} Report data + rendered HTML
   */
  async function generateReport(type, options = {}) {
    const year = options.year || new Date().getFullYear();
    const dateStart = options.dateStart || `${year}-01-01`;
    const dateEnd = options.dateEnd || `${year}-12-31`;

    switch (type) {
      case 'summary':
        return await summaryReport(dateStart, dateEnd, year);
      case 'category':
        return await categoryReport(dateStart, dateEnd, year);
      case 'vendor':
        return await vendorReport(dateStart, dateEnd, year);
      case 'monthly':
        return await monthlyReport(year);
      case 'comparison':
        return await comparisonReport(year, options.compareYear || year - 1);
      default:
        return { error: `Unknown report type: ${type}` };
    }
  }

  // ═══════════════════════════════════════════════
  //  1. EXPENSE SUMMARY REPORT
  // ═══════════════════════════════════════════════

  async function summaryReport(dateStart, dateEnd, year) {
    const stats = await DB.getStats(dateStart, dateEnd);
    const categoryTotals = await DB.getTotalsByCategory(dateStart, dateEnd);
    const monthlyTotals = await DB.getMonthlyTotals(year);

    // Find top category
    const topCategory = categoryTotals.length > 0 ? categoryTotals[0] : null;
    const topCatInfo = topCategory ? CONFIG.getCategory(topCategory.category) : null;

    // Find highest spending month
    const peakMonth = [...monthlyTotals].sort((a, b) => b.total - a.total)[0];

    // Payment method breakdown
    const paymentBreakdown = {};
    stats.expenses.forEach(e => {
      const method = e.payment_method || 'card';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + e.amount;
    });

    const html = `
      <div class="report-summary">
        <h3>Expense Summary — ${formatDateRange(dateStart, dateEnd)}</h3>

        <div class="report-stats-grid">
          <div class="report-stat">
            <span class="report-stat-label">Total Expenses</span>
            <span class="report-stat-value">${CONFIG.formatCurrency(stats.total)}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-label">Transactions</span>
            <span class="report-stat-value">${stats.count.toLocaleString()}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-label">Average per Transaction</span>
            <span class="report-stat-value">${CONFIG.formatCurrency(stats.avg)}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-label">Top Category</span>
            <span class="report-stat-value">${topCatInfo ? topCatInfo.icon + ' ' + topCatInfo.name : 'N/A'}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-label">Peak Month</span>
            <span class="report-stat-value">${peakMonth ? peakMonth.label + ' (' + CONFIG.formatCurrency(peakMonth.total) + ')' : 'N/A'}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-label">Daily Average</span>
            <span class="report-stat-value">${CONFIG.formatCurrency(stats.total / daysBetween(dateStart, dateEnd))}</span>
          </div>
        </div>

        <h4>Payment Method Breakdown</h4>
        <table class="data-table">
          <thead><tr><th>Method</th><th class="text-right">Total</th><th class="text-right">% of Total</th></tr></thead>
          <tbody>
            ${Object.entries(paymentBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([method, total]) => {
                const pm = CONFIG.paymentMethods.find(p => p.id === method);
                const pct = stats.total > 0 ? ((total / stats.total) * 100).toFixed(1) : '0.0';
                return `<tr>
                  <td>${pm ? pm.icon + ' ' + pm.label : method}</td>
                  <td class="text-right">${CONFIG.formatCurrency(total)}</td>
                  <td class="text-right">${pct}%</td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    `;

    return {
      type: 'summary',
      html,
      data: { stats, categoryTotals, monthlyTotals, paymentBreakdown },
      chartData: buildMonthlyChartData(monthlyTotals)
    };
  }

  // ═══════════════════════════════════════════════
  //  2. CATEGORY BREAKDOWN REPORT
  // ═══════════════════════════════════════════════

  async function categoryReport(dateStart, dateEnd, year) {
    const categoryTotals = await DB.getTotalsByCategory(dateStart, dateEnd);
    const stats = await DB.getStats(dateStart, dateEnd);

    const rows = categoryTotals.map(ct => {
      const cat = CONFIG.getCategory(ct.category);
      const taxLine = cat ? CONFIG.getTaxLine(cat.defaultTaxLine) : null;
      const pct = stats.total > 0 ? ((ct.total / stats.total) * 100).toFixed(1) : '0.0';

      return {
        categoryId: ct.category,
        name: cat ? cat.name : ct.category,
        icon: cat ? cat.icon : '📎',
        color: cat ? cat.color : '#9ca3af',
        total: ct.total,
        count: ct.count,
        percent: pct,
        avg: ct.count > 0 ? ct.total / ct.count : 0,
        taxLine: taxLine ? `Line ${taxLine.line}: ${taxLine.label}` : 'Unmapped'
      };
    });

    const html = `
      <div class="report-category">
        <h3>Expenses by Category — ${formatDateRange(dateStart, dateEnd)}</h3>
        <p class="report-subtitle">Total: ${CONFIG.formatCurrency(stats.total)} across ${stats.count} transactions</p>

        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th class="text-right">Total</th>
              <th class="text-right">%</th>
              <th class="text-right">Count</th>
              <th class="text-right">Avg</th>
              <th>Tax Line</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td><span style="color:${r.color}">${r.icon}</span> ${r.name}</td>
                <td class="text-right"><strong>${CONFIG.formatCurrency(r.total)}</strong></td>
                <td class="text-right">${r.percent}%</td>
                <td class="text-right">${r.count}</td>
                <td class="text-right">${CONFIG.formatCurrency(r.avg)}</td>
                <td><span class="badge badge-gray">${r.taxLine}</span></td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td class="text-right"><strong>${CONFIG.formatCurrency(stats.total)}</strong></td>
              <td class="text-right">100%</td>
              <td class="text-right">${stats.count}</td>
              <td class="text-right">${CONFIG.formatCurrency(stats.avg)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    return {
      type: 'category',
      html,
      data: { rows, stats },
      chartData: buildCategoryChartData(rows)
    };
  }

  // ═══════════════════════════════════════════════
  //  3. VENDOR BREAKDOWN REPORT
  // ═══════════════════════════════════════════════

  async function vendorReport(dateStart, dateEnd, year) {
    const vendorTotals = await DB.getTotalsByVendor(dateStart, dateEnd);
    const stats = await DB.getStats(dateStart, dateEnd);

    // Top 30 vendors
    const topVendors = vendorTotals.slice(0, 30);
    const otherTotal = vendorTotals.slice(30).reduce((sum, v) => sum + v.total, 0);
    const otherCount = vendorTotals.slice(30).reduce((sum, v) => sum + v.count, 0);

    const html = `
      <div class="report-vendor">
        <h3>Expenses by Vendor — ${formatDateRange(dateStart, dateEnd)}</h3>
        <p class="report-subtitle">${vendorTotals.length} unique vendors, ${stats.count} total transactions</p>

        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Vendor</th>
              <th class="text-right">Total</th>
              <th class="text-right">%</th>
              <th class="text-right">Transactions</th>
              <th class="text-right">Avg</th>
            </tr>
          </thead>
          <tbody>
            ${topVendors.map((v, i) => {
              const pct = stats.total > 0 ? ((v.total / stats.total) * 100).toFixed(1) : '0.0';
              const avg = v.count > 0 ? v.total / v.count : 0;
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${escapeHtml(v.vendor)}</strong></td>
                  <td class="text-right">${CONFIG.formatCurrency(v.total)}</td>
                  <td class="text-right">${pct}%</td>
                  <td class="text-right">${v.count}</td>
                  <td class="text-right">${CONFIG.formatCurrency(avg)}</td>
                </tr>
              `;
            }).join('')}
            ${otherTotal > 0 ? `
              <tr>
                <td></td>
                <td><em>All Others (${vendorTotals.length - 30} vendors)</em></td>
                <td class="text-right">${CONFIG.formatCurrency(otherTotal)}</td>
                <td class="text-right">${stats.total > 0 ? ((otherTotal / stats.total) * 100).toFixed(1) : '0.0'}%</td>
                <td class="text-right">${otherCount}</td>
                <td class="text-right">—</td>
              </tr>
            ` : ''}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2"><strong>Total</strong></td>
              <td class="text-right"><strong>${CONFIG.formatCurrency(stats.total)}</strong></td>
              <td class="text-right">100%</td>
              <td class="text-right">${stats.count}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    return {
      type: 'vendor',
      html,
      data: { topVendors, otherTotal, otherCount, stats },
      chartData: buildVendorChartData(topVendors.slice(0, 10))
    };
  }

  // ═══════════════════════════════════════════════
  //  4. MONTHLY BREAKDOWN REPORT
  // ═══════════════════════════════════════════════

  async function monthlyReport(year) {
    const months = await DB.getMonthlyTotals(year);
    const categoryTotals = await DB.getTotalsByCategory(`${year}-01-01`, `${year}-12-31`);
    const yearTotal = months.reduce((sum, m) => sum + m.total, 0);
    const yearCount = months.reduce((sum, m) => sum + m.count, 0);

    // Build month × category matrix
    const { data: allExpenses } = await DB.getExpenses(
      { dateStart: `${year}-01-01`, dateEnd: `${year}-12-31` },
      { page: 1, pageSize: 100000, sortBy: 'date' }
    );

    // Get top 8 categories for the matrix
    const topCats = categoryTotals.slice(0, 8);
    const matrix = {};

    topCats.forEach(tc => {
      matrix[tc.category] = Array(12).fill(0);
    });

    allExpenses.forEach(e => {
      const m = new Date(e.date + 'T00:00:00').getMonth();
      const cat = e.category || 'miscellaneous';
      if (matrix[cat] !== undefined) {
        matrix[cat][m] += e.amount;
      }
    });

    const html = `
      <div class="report-monthly">
        <h3>Monthly Breakdown — ${year}</h3>
        <p class="report-subtitle">Total: ${CONFIG.formatCurrency(yearTotal)} | ${yearCount} transactions</p>

        <table class="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th class="text-right">Total</th>
              <th class="text-right">Transactions</th>
              <th class="text-right">Avg</th>
              <th>Bar</th>
            </tr>
          </thead>
          <tbody>
            ${months.map(m => {
              const avg = m.count > 0 ? m.total / m.count : 0;
              const maxTotal = Math.max(...months.map(x => x.total), 1);
              const barWidth = Math.round((m.total / maxTotal) * 100);
              return `
                <tr>
                  <td><strong>${m.label}</strong></td>
                  <td class="text-right">${CONFIG.formatCurrency(m.total)}</td>
                  <td class="text-right">${m.count}</td>
                  <td class="text-right">${CONFIG.formatCurrency(avg)}</td>
                  <td>
                    <div style="background:${m.total > 0 ? 'var(--blue)' : 'var(--gray-200)'};
                      height:18px;width:${barWidth}%;border-radius:3px;min-width:${m.total > 0 ? '4px' : '0'}">
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>Year Total</strong></td>
              <td class="text-right"><strong>${CONFIG.formatCurrency(yearTotal)}</strong></td>
              <td class="text-right">${yearCount}</td>
              <td class="text-right">${CONFIG.formatCurrency(yearCount > 0 ? yearTotal / yearCount : 0)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <h4 style="margin-top:1.5rem">Category × Month Matrix (Top 8)</h4>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                ${months.map(m => `<th class="text-right">${m.label}</th>`).join('')}
                <th class="text-right"><strong>Total</strong></th>
              </tr>
            </thead>
            <tbody>
              ${topCats.map(tc => {
                const cat = CONFIG.getCategory(tc.category);
                const vals = matrix[tc.category] || Array(12).fill(0);
                const rowTotal = vals.reduce((s, v) => s + v, 0);
                return `
                  <tr>
                    <td>${cat ? cat.icon + ' ' + cat.name : tc.category}</td>
                    ${vals.map(v => `<td class="text-right">${v > 0 ? CONFIG.formatCurrency(v) : '—'}</td>`).join('')}
                    <td class="text-right"><strong>${CONFIG.formatCurrency(rowTotal)}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    return {
      type: 'monthly',
      html,
      data: { months, matrix, topCats, yearTotal, yearCount },
      chartData: buildMonthlyChartData(months)
    };
  }

  // ═══════════════════════════════════════════════
  //  5. YEAR-OVER-YEAR COMPARISON
  // ═══════════════════════════════════════════════

  async function comparisonReport(year1, year2) {
    const months1 = await DB.getMonthlyTotals(year1);
    const months2 = await DB.getMonthlyTotals(year2);

    const total1 = months1.reduce((s, m) => s + m.total, 0);
    const total2 = months2.reduce((s, m) => s + m.total, 0);
    const diff = total1 - total2;
    const pctChange = total2 > 0 ? ((diff / total2) * 100).toFixed(1) : 'N/A';

    const cat1 = await DB.getTotalsByCategory(`${year1}-01-01`, `${year1}-12-31`);
    const cat2 = await DB.getTotalsByCategory(`${year2}-01-01`, `${year2}-12-31`);

    // Merge categories for comparison
    const allCatIds = new Set([...cat1.map(c => c.category), ...cat2.map(c => c.category)]);
    const catComparison = Array.from(allCatIds).map(catId => {
      const c1 = cat1.find(c => c.category === catId);
      const c2 = cat2.find(c => c.category === catId);
      const t1 = c1 ? c1.total : 0;
      const t2 = c2 ? c2.total : 0;
      const d = t1 - t2;
      const cat = CONFIG.getCategory(catId);

      return {
        categoryId: catId,
        name: cat ? cat.name : catId,
        icon: cat ? cat.icon : '📎',
        year1Total: t1,
        year2Total: t2,
        diff: d,
        pctChange: t2 > 0 ? ((d / t2) * 100).toFixed(1) : (t1 > 0 ? '+100' : '0')
      };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    const changeClass = diff > 0 ? 'color:var(--red)' : diff < 0 ? 'color:var(--green)' : '';
    const changeArrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';

    const html = `
      <div class="report-comparison">
        <h3>Year-over-Year Comparison — ${year2} vs ${year1}</h3>

        <div class="report-stats-grid">
          <div class="report-stat">
            <span class="report-stat-label">${year1} Total</span>
            <span class="report-stat-value">${CONFIG.formatCurrency(total1)}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-label">${year2} Total</span>
            <span class="report-stat-value">${CONFIG.formatCurrency(total2)}</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-label">Difference</span>
            <span class="report-stat-value" style="${changeClass}">${changeArrow} ${CONFIG.formatCurrency(Math.abs(diff))} (${pctChange}%)</span>
          </div>
        </div>

        <h4>Monthly Comparison</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th class="text-right">${year1}</th>
              <th class="text-right">${year2}</th>
              <th class="text-right">Difference</th>
              <th class="text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            ${months1.map((m1, i) => {
              const m2 = months2[i];
              const md = m1.total - m2.total;
              const mp = m2.total > 0 ? ((md / m2.total) * 100).toFixed(1) : (m1.total > 0 ? '+100' : '0');
              const mc = md > 0 ? 'color:var(--red)' : md < 0 ? 'color:var(--green)' : '';
              return `
                <tr>
                  <td><strong>${m1.label}</strong></td>
                  <td class="text-right">${CONFIG.formatCurrency(m1.total)}</td>
                  <td class="text-right">${CONFIG.formatCurrency(m2.total)}</td>
                  <td class="text-right" style="${mc}">${CONFIG.formatCurrency(Math.abs(md))}</td>
                  <td class="text-right" style="${mc}">${md > 0 ? '+' : md < 0 ? '' : ''}${mp}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h4 style="margin-top:1.5rem">Category Comparison</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th class="text-right">${year1}</th>
              <th class="text-right">${year2}</th>
              <th class="text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            ${catComparison.map(c => {
              const cc = c.diff > 0 ? 'color:var(--red)' : c.diff < 0 ? 'color:var(--green)' : '';
              return `
                <tr>
                  <td>${c.icon} ${c.name}</td>
                  <td class="text-right">${CONFIG.formatCurrency(c.year1Total)}</td>
                  <td class="text-right">${CONFIG.formatCurrency(c.year2Total)}</td>
                  <td class="text-right" style="${cc}">${c.diff > 0 ? '+' : ''}${c.pctChange}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    return {
      type: 'comparison',
      html,
      data: { months1, months2, total1, total2, diff, catComparison },
      chartData: buildComparisonChartData(months1, months2, year1, year2)
    };
  }

  // ═══════════════════════════════════════════════
  //  SCHEDULE F TAX REPORT
  // ═══════════════════════════════════════════════

  async function generateTaxReport(year) {
    return await DB.getScheduleFReport(year);
  }

  // ═══════════════════════════════════════════════
  //  CHART DATA BUILDERS
  // ═══════════════════════════════════════════════

  function buildMonthlyChartData(months) {
    return {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [{
          label: 'Monthly Expenses',
          data: months.map(m => m.total),
          backgroundColor: CONFIG.chartColors[0] + '99',
          borderColor: CONFIG.chartColors[0],
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => CONFIG.formatCurrency(ctx.parsed.y)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: val => CONFIG.formatCurrency(val)
            }
          }
        }
      }
    };
  }

  function buildCategoryChartData(rows) {
    return {
      type: 'doughnut',
      data: {
        labels: rows.map(r => r.name),
        datasets: [{
          data: rows.map(r => r.total),
          backgroundColor: rows.map(r => r.color + 'CC'),
          borderColor: rows.map(r => r.color),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { size: 11 }, padding: 12 }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const val = CONFIG.formatCurrency(ctx.parsed);
                const pct = rows[ctx.dataIndex]?.percent || '0';
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    };
  }

  function buildVendorChartData(topVendors) {
    return {
      type: 'bar',
      data: {
        labels: topVendors.map(v => truncate(v.vendor, 20)),
        datasets: [{
          label: 'Total Spent',
          data: topVendors.map(v => v.total),
          backgroundColor: CONFIG.chartColors.slice(0, topVendors.length).map(c => c + '99'),
          borderColor: CONFIG.chartColors.slice(0, topVendors.length),
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => CONFIG.formatCurrency(ctx.parsed.x)
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: val => CONFIG.formatCurrency(val)
            }
          }
        }
      }
    };
  }

  function buildComparisonChartData(months1, months2, year1, year2) {
    return {
      type: 'bar',
      data: {
        labels: months1.map(m => m.label),
        datasets: [
          {
            label: String(year1),
            data: months1.map(m => m.total),
            backgroundColor: CONFIG.chartColors[0] + '99',
            borderColor: CONFIG.chartColors[0],
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: String(year2),
            data: months2.map(m => m.total),
            backgroundColor: CONFIG.chartColors[1] + '99',
            borderColor: CONFIG.chartColors[1],
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${CONFIG.formatCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: val => CONFIG.formatCurrency(val) }
          }
        }
      }
    };
  }

  // ═══════════════════════════════════════════════
  //  CHART RENDERING
  // ═══════════════════════════════════════════════

  function renderChart(canvasId, chartData) {
    // Destroy existing chart on this canvas
    if (activeCharts[canvasId]) {
      activeCharts[canvasId].destroy();
      delete activeCharts[canvasId];
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, chartData);
    activeCharts[canvasId] = chart;
    return chart;
  }

  function destroyAllCharts() {
    Object.keys(activeCharts).forEach(id => {
      activeCharts[id].destroy();
    });
    activeCharts = {};
  }

  // ═══════════════════════════════════════════════
  //  EXCEL EXPORT — EXPENSE LIST
  // ═══════════════════════════════════════════════

  /**
   * Export filtered expenses to an Excel workbook
   */
  async function exportExpensesToExcel(dateStart, dateEnd, fileName) {
    const rows = await DB.exportExpenses(dateStart, dateEnd);

    if (rows.length === 0) {
      if (typeof APP !== 'undefined') APP.showToast('No expenses to export.', 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: All Expenses
    const headers = [
      'Date', 'Vendor', 'Amount', 'Category', 'Subcategory',
      'Tax Line #', 'Tax Line Description', 'Payment Method',
      'Check/Ref #', 'Description', 'Tags', 'Created By'
    ];

    const wsData = [headers, ...rows.map(r => [
      r.date, r.vendor, r.amount, r.category, r.subcategory,
      r.tax_line_number, r.tax_line_description, r.payment_method,
      r.check_number, r.description, r.tags, r.created_by
    ])];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 22 }, { wch: 20 },
      { wch: 10 }, { wch: 30 }, { wch: 15 },
      { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 15 }
    ];

    // Format amount column as currency
    for (let i = 1; i <= rows.length; i++) {
      const cell = ws[XLSX.utils.encode_cell({ r: i, c: 2 })];
      if (cell) cell.z = '$#,##0.00';
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

    // Sheet 2: Category Summary
    const catSummary = {};
    rows.forEach(r => {
      if (!catSummary[r.category]) catSummary[r.category] = { total: 0, count: 0 };
      catSummary[r.category].total += r.amount;
      catSummary[r.category].count++;
    });

    const catData = [
      ['Category', 'Total', 'Transactions', 'Average'],
      ...Object.entries(catSummary)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([cat, data]) => [
          cat, data.total, data.count, data.count > 0 ? data.total / data.count : 0
        ])
    ];

    const wsCat = XLSX.utils.aoa_to_sheet(catData);
    wsCat['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsCat, 'By Category');

    // Download
    const name = fileName || `Expenses_${dateStart}_to_${dateEnd}.xlsx`;
    XLSX.writeFile(wb, name);

    if (typeof APP !== 'undefined') APP.showToast(`Exported ${rows.length} expenses to Excel.`, 'success');
  }

  // ═══════════════════════════════════════════════
  //  EXCEL EXPORT — FULL REPORT WORKBOOK
  // ═══════════════════════════════════════════════

  async function exportReportToExcel(reportType, options = {}) {
    const year = options.year || new Date().getFullYear();
    const dateStart = `${year}-01-01`;
    const dateEnd = `${year}-12-31`;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Raw expenses
    const rawRows = await DB.exportExpenses(dateStart, dateEnd);
    if (rawRows.length > 0) {
      const rawHeaders = Object.keys(rawRows[0]);
      const rawData = [rawHeaders, ...rawRows.map(r => rawHeaders.map(h => r[h]))];
      const wsRaw = XLSX.utils.aoa_to_sheet(rawData);
      wsRaw['!cols'] = rawHeaders.map(() => ({ wch: 18 }));
      XLSX.utils.book_append_sheet(wb, wsRaw, 'All Expenses');
    }

    // Sheet 2: Category breakdown
    const catTotals = await DB.getTotalsByCategory(dateStart, dateEnd);
    if (catTotals.length > 0) {
      const catData = [
        ['Category', 'Total', 'Transactions', 'Average', 'Tax Line'],
        ...catTotals.map(ct => {
          const cat = CONFIG.getCategory(ct.category);
          const tl = cat ? CONFIG.getTaxLine(cat.defaultTaxLine) : null;
          return [
            cat ? cat.name : ct.category,
            ct.total,
            ct.count,
            ct.count > 0 ? ct.total / ct.count : 0,
            tl ? `Line ${tl.line}: ${tl.label}` : 'Unmapped'
          ];
        })
      ];
      const wsCat = XLSX.utils.aoa_to_sheet(catData);
      wsCat['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 35 }];
      XLSX.utils.book_append_sheet(wb, wsCat, 'By Category');
    }

    // Sheet 3: Monthly breakdown
    const months = await DB.getMonthlyTotals(year);
    const monthData = [
      ['Month', 'Total', 'Transactions', 'Average'],
      ...months.map(m => [m.label, m.total, m.count, m.count > 0 ? m.total / m.count : 0])
    ];
    const wsMonth = XLSX.utils.aoa_to_sheet(monthData);
    wsMonth['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsMonth, 'Monthly');

    // Sheet 4: Vendor breakdown
    const vendorTotals = await DB.getTotalsByVendor(dateStart, dateEnd);
    if (vendorTotals.length > 0) {
      const vendorData = [
        ['Vendor', 'Total', 'Transactions', 'Average'],
        ...vendorTotals.map(v => [
          v.vendor, v.total, v.count, v.count > 0 ? v.total / v.count : 0
        ])
      ];
      const wsVendor = XLSX.utils.aoa_to_sheet(vendorData);
      wsVendor['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsVendor, 'By Vendor');
    }

    // Download
    const name = `Farm_Report_${year}_${reportType}.xlsx`;
    XLSX.writeFile(wb, name);
    if (typeof APP !== 'undefined') APP.showToast('Report exported to Excel.', 'success');
  }

  // ═══════════════════════════════════════════════
  //  EXCEL EXPORT — SCHEDULE F TAX WORKBOOK
  // ═══════════════════════════════════════════════

  async function exportTaxReportToExcel(year) {
    const report = await DB.getScheduleFReport(year);
    const wb = XLSX.utils.book_new();

    // Sheet 1: Schedule F Summary
    const sfData = [
      [`Schedule F — Farm Expenses — ${year}`],
      ['Boles West Run Ranch'],
      [],
      ['Line #', 'IRS Description', 'Total', 'Transactions'],
      ...report.lines
        .filter(l => l.total > 0)
        .map(l => [
          `Line ${l.line}`, l.label, l.total, l.count
        ]),
      [],
      ['', 'TOTAL FARM EXPENSES', report.grandTotal, '']
    ];

    const wsSF = XLSX.utils.aoa_to_sheet(sfData);
    wsSF['!cols'] = [{ wch: 12 }, { wch: 38 }, { wch: 16 }, { wch: 14 }];

    // Format currency cells
    for (let i = 4; i < sfData.length; i++) {
      const cell = wsSF[XLSX.utils.encode_cell({ r: i, c: 2 })];
      if (cell && typeof cell.v === 'number') cell.z = '$#,##0.00';
    }

    XLSX.utils.book_append_sheet(wb, wsSF, 'Schedule F Summary');

    // Sheet 2: Detailed expenses by tax line
    for (const line of report.lines) {
      if (line.total <= 0) continue;

      const lineExpenses = await getExpensesByTaxLine(line.id, year);
      if (lineExpenses.length === 0) continue;

      const sheetName = `L${line.line} ${line.label}`.slice(0, 31); // Excel 31-char limit
      const lineData = [
        [`Line ${line.line}: ${line.label}`],
        [],
        ['Date', 'Vendor', 'Amount', 'Category', 'Description', 'Payment', 'Check/Ref'],
        ...lineExpenses.map(e => [
          e.date,
          e.vendor || '',
          e.amount,
          CONFIG.getCategory(e.category)?.name || e.category || '',
          e.description || '',
          e.payment_method || '',
          e.check_number || ''
        ]),
        [],
        ['', 'LINE TOTAL', lineExpenses.reduce((s, e) => s + e.amount, 0)]
      ];

      const wsLine = XLSX.utils.aoa_to_sheet(lineData);
      wsLine['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 22 },
        { wch: 30 }, { wch: 15 }, { wch: 12 }
      ];

      XLSX.utils.book_append_sheet(wb, wsLine, sheetName);
    }

    // Sheet: Unmapped expenses
    if (report.unmapped.length > 0) {
      const unmappedData = [
        ['UNMAPPED EXPENSES — No IRS Tax Line Assigned'],
        [],
        ['Date', 'Vendor', 'Amount', 'Category', 'Description'],
        ...report.unmapped.map(e => [
          e.date,
          e.vendor || '',
          e.amount,
          CONFIG.getCategory(e.category)?.name || e.category || '',
          e.description || ''
        ]),
        [],
        ['', 'UNMAPPED TOTAL', report.unmappedTotal]
      ];

      const wsUnmapped = XLSX.utils.aoa_to_sheet(unmappedData);
      wsUnmapped['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 22 }, { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(wb, wsUnmapped, 'Unmapped');
    }

    // Download
    const name = `Schedule_F_${year}_Boles_West_Run_Ranch.xlsx`;
    XLSX.writeFile(wb, name);
    if (typeof APP !== 'undefined') APP.showToast('Schedule F tax report exported.', 'success');
  }

  // ═══════════════════════════════════════════════
  //  HELPER: Get expenses filtered by tax line
  // ═══════════════════════════════════════════════

  async function getExpensesByTaxLine(taxLineId, year) {
    const { data } = await DB.getExpenses(
      {
        taxLine: taxLineId,
        dateStart: `${year}-01-01`,
        dateEnd: `${year}-12-31`
      },
      { page: 1, pageSize: 100000, sortBy: 'date', sortDir: 'asc' }
    );
    return data;
  }

  // ═══════════════════════════════════════════════
  //  UTILITY HELPERS
  // ═══════════════════════════════════════════════

  function formatDateRange(start, end) {
    return `${CONFIG.formatDate(start)} — ${CONFIG.formatDate(end)}`;
  }

  function daysBetween(start, end) {
    const d1 = new Date(start + 'T00:00:00');
    const d2 = new Date(end + 'T00:00:00');
    const diff = Math.abs(d2 - d1);
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  function truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════
  //  DASHBOARD CHART RENDERERS
  //  Called by app.js to populate the dashboard
  // ═══════════════════════════════════════════════

  async function renderDashboardCharts(dateStart, dateEnd, year) {
    // Category doughnut
    const catTotals = await DB.getTotalsByCategory(dateStart, dateEnd);
    if (catTotals.length > 0) {
      const catRows = catTotals.map(ct => {
        const cat = CONFIG.getCategory(ct.category);
        return {
          name: cat ? cat.name : ct.category,
          total: ct.total,
          color: cat ? cat.color : '#9ca3af',
          percent: '0'
        };
      });
      renderChart('chart-category', buildCategoryChartData(catRows));
    }

    // Monthly trend bar
    const months = await DB.getMonthlyTotals(year);
    renderChart('chart-trend', buildMonthlyChartData(months));
  }

  // ═══════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════
  return {
    // Report generation
    generateReport,
    generateTaxReport,

    // Chart rendering
    renderChart,
    renderDashboardCharts,
    destroyAllCharts,

    // Excel export
    exportExpensesToExcel,
    exportReportToExcel,
    exportTaxReportToExcel
  };

})();
