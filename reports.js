
// REPORTS MODULE — Customizable Reports & Export
const REPORTS = (() => {
	// Generate report data and HTML for the selected type
	async function generateReport(type, opts = {}) {
		const year = opts.year || new Date().getFullYear();
		let html = '', chartData = null, error = null;
		try {
			switch (type) {
				case 'summary': {
					const { total, count, avg } = await DB.getStats(`${year}-01-01`, `${year}-12-31`);
					html = `<h3>Expense Summary (${year})</h3>
						<ul class="stat-list">
							<li><strong>Total Expenses:</strong> ${CONFIG.formatCurrency(total)}</li>
							<li><strong>Transactions:</strong> ${count}</li>
							<li><strong>Average per Transaction:</strong> ${CONFIG.formatCurrency(avg)}</li>
						</ul>`;
					chartData = null;
					break;
				}
				case 'category': {
					const cats = await DB.getTotalsByCategory(`${year}-01-01`, `${year}-12-31`);
					html = `<h3>Expenses by Category (${year})</h3><table class="data-table"><thead><tr><th>Category</th><th>Total</th><th>Count</th></tr></thead><tbody>` +
						cats.map(c => `<tr><td>${CONFIG.getCategory(c.category)?.name || c.category}</td><td>${CONFIG.formatCurrency(c.total)}</td><td>${c.count}</td></tr>`).join('') +
						`</tbody></table>`;
					chartData = {
						type: 'pie',
						data: {
							labels: cats.map(c => CONFIG.getCategory(c.category)?.name || c.category),
							datasets: [{ data: cats.map(c => c.total), backgroundColor: cats.map(c => CONFIG.getCategory(c.category)?.color || '#888') }]
						}
					};
					break;
				}
				case 'vendor': {
					const vendors = await DB.getTotalsByVendor(`${year}-01-01`, `${year}-12-31`);
					html = `<h3>Expenses by Vendor (${year})</h3><table class="data-table"><thead><tr><th>Vendor</th><th>Total</th><th>Count</th></tr></thead><tbody>` +
						vendors.map(v => `<tr><td>${v.vendor}</td><td>${CONFIG.formatCurrency(v.total)}</td><td>${v.count}</td></tr>`).join('') +
						`</tbody></table>`;
					chartData = {
						type: 'bar',
						data: {
							labels: vendors.map(v => v.vendor),
							datasets: [{ label: 'Total', data: vendors.map(v => v.total), backgroundColor: '#4e79a7' }]
						}
					};
					break;
				}
				case 'monthly': {
					const months = await DB.getMonthlyTotals(year);
					html = `<h3>Monthly Breakdown (${year})</h3><table class="data-table"><thead><tr><th>Month</th><th>Total</th><th>Count</th></tr></thead><tbody>` +
						months.map((m, i) => `<tr><td>${m.label}</td><td>${CONFIG.formatCurrency(m.total)}</td><td>${m.count}</td></tr>`).join('') +
						`</tbody></table>`;
					chartData = {
						type: 'line',
						data: {
							labels: months.map(m => m.label),
							datasets: [{ label: 'Total', data: months.map(m => m.total), borderColor: '#f28e2b', fill: false }]
						}
					};
					break;
				}
				case 'comparison': {
					// Compare this year vs last year
					const thisYear = await DB.getMonthlyTotals(year);
					const lastYear = await DB.getMonthlyTotals(year - 1);
					html = `<h3>Year-over-Year Comparison (${year} vs ${year - 1})</h3><table class="data-table"><thead><tr><th>Month</th><th>${year - 1}</th><th>${year}</th></tr></thead><tbody>` +
						thisYear.map((m, i) => `<tr><td>${m.label}</td><td>${CONFIG.formatCurrency(lastYear[i]?.total || 0)}</td><td>${CONFIG.formatCurrency(m.total)}</td></tr>`).join('') +
						`</tbody></table>`;
					chartData = {
						type: 'line',
						data: {
							labels: thisYear.map(m => m.label),
							datasets: [
								{ label: `${year - 1}`, data: lastYear.map(m => m.total), borderColor: '#59a14f', fill: false },
								{ label: `${year}`, data: thisYear.map(m => m.total), borderColor: '#e15759', fill: false }
							]
						}
					};
					break;
				}
				default:
					error = 'Unknown report type.';
			}
		} catch (e) {
			error = e.message;
		}
		return { html, chartData, error };
	}

	// Render chart using Chart.js
	function renderChart(canvasId, chartData) {
		if (!window.Chart) return;
		const ctx = document.getElementById(canvasId).getContext('2d');
		if (window._reportChart) window._reportChart.destroy();
		window._reportChart = new Chart(ctx, chartData);
	}

	// Export report to Excel
	async function exportReportToExcel(type, opts = {}) {
		const year = opts.year || new Date().getFullYear();
		let wb = XLSX.utils.book_new();
		let ws = null;
		switch (type) {
			case 'summary': {
				const { total, count, avg } = await DB.getStats(`${year}-01-01`, `${year}-12-31`);
				ws = XLSX.utils.aoa_to_sheet([
					['Expense Summary', year],
					['Total Expenses', total],
					['Transactions', count],
					['Average per Transaction', avg]
				]);
				break;
			}
			case 'category': {
				const cats = await DB.getTotalsByCategory(`${year}-01-01`, `${year}-12-31`);
				ws = XLSX.utils.aoa_to_sheet([
					['Category', 'Total', 'Count'],
					...cats.map(c => [CONFIG.getCategory(c.category)?.name || c.category, c.total, c.count])
				]);
				break;
			}
			case 'vendor': {
				const vendors = await DB.getTotalsByVendor(`${year}-01-01`, `${year}-12-31`);
				ws = XLSX.utils.aoa_to_sheet([
					['Vendor', 'Total', 'Count'],
					...vendors.map(v => [v.vendor, v.total, v.count])
				]);
				break;
			}
			case 'monthly': {
				const months = await DB.getMonthlyTotals(year);
				ws = XLSX.utils.aoa_to_sheet([
					['Month', 'Total', 'Count'],
					...months.map(m => [m.label, m.total, m.count])
				]);
				break;
			}
			case 'comparison': {
				const thisYear = await DB.getMonthlyTotals(year);
				const lastYear = await DB.getMonthlyTotals(year - 1);
				ws = XLSX.utils.aoa_to_sheet([
					['Month', `${year - 1}`, `${year}`],
					...thisYear.map((m, i) => [m.label, lastYear[i]?.total || 0, m.total])
				]);
				break;
			}
			default:
				ws = XLSX.utils.aoa_to_sheet([['Unknown report type']]);
		}
		XLSX.utils.book_append_sheet(wb, ws, 'Report');
		XLSX.writeFile(wb, `Expense_Report_${type}_${year}.xlsx`);
	}

	// Tax report (Schedule F)
	async function generateTaxReport(year) {
		return await DB.getScheduleFReport(year);
	}

	// Export all expenses to Excel for a date range
	async function exportExpensesToExcel(dateStart, dateEnd) {
		const { expenses } = await DB.getStats(dateStart, dateEnd);
		const wb = XLSX.utils.book_new();
		const headers = ['Date', 'Vendor', 'Amount', 'Category', 'Tax Line', 'Payment', 'Description'];
		const rows = expenses.map(e => {
			const cat = CONFIG.getCategory(e.category);
			const tl = CONFIG.getTaxLine(e.tax_line);
			return [
				e.date, e.vendor, e.amount,
				cat ? cat.name : e.category,
				tl ? `Line ${tl.line}` : '',
				e.payment_method, e.description || ''
			];
		});
		const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
		ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 15 }, { wch: 30 }];
		XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
		XLSX.writeFile(wb, `Expenses_${dateStart}_to_${dateEnd}.xlsx`);
	}

	return {
		generateReport,
		renderChart,
		exportReportToExcel,
		generateTaxReport,
		exportExpensesToExcel
	};
})();
