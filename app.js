      // RECEIPT GALLERY
      function refreshReceiptGallery() {
        const grid = document.getElementById('receipt-gallery-grid');
        const receipts = OCR.getAllReceipts();
        if (!receipts.length) {
          grid.innerHTML = '<p class="info-text">No receipts found. Attach receipts to expenses to view them here.</p>';
          return;
        }
        grid.innerHTML = receipts.map(e => `
          <div class="gallery-item">
            <img src="${e.receipt_url}" alt="Receipt for ${escapeHtml(e.vendor || '')}" />
            <div class="gallery-meta">
              <div><strong>${escapeHtml(e.vendor || '—')}</strong></div>
              <div>${CONFIG.formatDate(e.date)}</div>
              <div>${CONFIG.formatCurrency(e.amount)}</div>
            </div>
          </div>
        `).join('');
      }
    // ═══════════════════════════════════════════════
    //  ADD TEST DATA BUTTON
    // ═══════════════════════════════════════════════
    function bindAddTestDataButton() {
      const btn = document.getElementById('add-test-data-btn');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
        await DB.addTestData();
        btn.innerHTML = '<i class="fa-solid fa-vial"></i> Add Test Data';
        btn.disabled = false;
        if (typeof showToast === 'function') showToast('Test data added!', 'success');
        if (currentView === 'dashboard') refreshDashboard();
      });
    }
  // ═══════════════════════════════════════════════
  //  SAVE & SYNC BUTTON
  // ═══════════════════════════════════════════════
  function bindSaveSyncButton() {
    // Dashboard
    const btnDash = document.getElementById('save-sync-btn');
    if (btnDash) {
      btnDash.addEventListener('click', async () => {
        btnDash.disabled = true;
        btnDash.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        await DB.flushSyncQueue();
        btnDash.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Sync';
        btnDash.disabled = false;
        if (typeof showToast === 'function') showToast('Changes saved and synced!', 'success');
        if (currentView === 'dashboard') refreshDashboard();
      });
    }

    // Add Expense
    const btnExpense = document.getElementById('save-sync-btn-expense');
    if (btnExpense) {
      btnExpense.addEventListener('click', async () => {
        btnExpense.disabled = true;
        btnExpense.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        await DB.flushSyncQueue();
        btnExpense.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Sync';
        btnExpense.disabled = false;
        if (typeof showToast === 'function') showToast('Changes saved and synced!', 'success');
        if (currentView === 'expenses') refreshExpenseList();
      });
    }

    // Scan Receipt
    const btnOcr = document.getElementById('save-sync-btn-ocr');
    if (btnOcr) {
      btnOcr.addEventListener('click', async () => {
        btnOcr.disabled = true;
        btnOcr.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        await DB.flushSyncQueue();
        btnOcr.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save & Sync';
        btnOcr.disabled = false;
        if (typeof showToast === 'function') showToast('Changes saved and synced!', 'success');
        if (currentView === 'receipt-scan') refreshDashboard();
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  AUTOSAVE & SYNC EVERY 5 MINUTES
  // ═══════════════════════════════════════════════
  function startAutoSaveSync() {
    setInterval(async () => {
      await DB.flushSyncQueue();
      if (typeof showToast === 'function') showToast('Autosaved & synced!', 'info');
    }, 5 * 60 * 1000); // 5 minutes
  }
/* ═══════════════════════════════════════════════
   APP.JS — Main Application Controller
   Boles West Run Ranch — Expense Tracker

   Wires together: CONFIG, DB, AUTH, OCR,
   CATEGORIZE, and REPORTS modules.
   ═══════════════════════════════════════════════ */

const APP = (() => {

  // ─── STATE ───
  let currentView = 'dashboard';
  let currentPage = 1;
  let currentSort = { by: 'date', dir: 'desc' };
  let selectedExpenseIds = new Set();
  let editingExpenseId = null;
  let receiptFile = null;
  let receiptDataUrl = null;
  let currentAccount = 'all'; // Track selected account

  // ═══════════════════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════════════════

  async function init() {
    console.log('APP: Initializing Boles West Run Ranch Expense Tracker...');



    // 2. Init database layer
    const dbStatus = await DB.initialize();
    console.log('APP: DB status', dbStatus);

    // 3. Sync status indicator
    DB.onSyncStatusChange(updateSyncBadge);
    updateSyncBadge(dbStatus.mode === 'cloud' && dbStatus.online ? 'synced' : 'local');

    // 4. Bind all event listeners (auth removed)
    bindNavigationEvents();
    bindExpenseFormEvents();
    bindExpenseListEvents();
    bindReceiptScanEvents();
    bindReportEvents();
    bindTaxCenterEvents();
    bindSettingsEvents();
    bindUserManagementEvents();
    bindModalEvents();
    bindKeyboardShortcuts();


    // 5. Always show app screen (login removed)
    showAppScreen();

    console.log('APP: Ready.');
  }

  // ═══════════════════════════════════════════════
  //  SCREEN SWITCHING
  // ═══════════════════════════════════════════════


  // showAuthScreen removed

  async function showAppScreen() {
    // document.getElementById('auth-screen').classList.remove('active');
    // document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('active');

    // Update user display

    // Hide user name and role-based UI (login removed)
    // document.getElementById('user-name-display').textContent = '';

    // Populate dropdowns
    populateCategoryDropdowns();
    populateTaxLineDropdowns();
    populateYearDropdowns();
    await populateVendorSuggestions();

    // Subscribe to real-time changes
    DB.subscribeToExpenses(() => {
      if (currentView === 'dashboard') refreshDashboard();
      if (currentView === 'expenses') refreshExpenseList();
    });

    // Bind Save & Sync button
    bindSaveSyncButton();

    // Bind Add Test Data button
    bindAddTestDataButton();
      // Bind Remove Test Data button
      bindRemoveTestDataButton();
function bindRemoveTestDataButton() {
  const btn = document.getElementById('remove-test-data-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Removing...';
    await DB.removeTestData();
    btn.innerHTML = '<i class="fa-solid fa-eraser"></i> Remove Test Data';
    btn.disabled = false;
    if (typeof showToast === 'function') showToast('Test data removed!', 'success');
    if (currentView === 'dashboard') refreshDashboard();
  });
}

    // Start autosave & sync
    startAutoSaveSync();

    // Load dashboard
    navigateTo('dashboard');
  }

  // ═══════════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════════

  function navigateTo(view) {

    // All views are now always available

    // Hide all views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      v.classList.add('hidden');
    });


    // Show target view
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) {
      viewEl.classList.add('active');
      viewEl.classList.remove('hidden');
      if (view === 'receipt-gallery') refreshReceiptGallery();
    }

    // Update sidebar active state
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });

    currentView = view;

    // Load view data
    switch (view) {
      case 'dashboard':   refreshDashboard(); break;
      case 'expenses':    refreshExpenseList(); break;
      case 'add-expense': prepareExpenseForm(); break;
      case 'categories':  refreshCategoriesView(); break;
      case 'reports':     break;
      case 'tax-center':  break;
      case 'settings':    loadSettings(); break;
      case 'manage-users': refreshUsersList(); break;
    }

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
  }

  // Auth event handlers removed

  // ═══════════════════════════════════════════════
  //  NAVIGATION EVENT HANDLERS
  // ═══════════════════════════════════════════════


  function bindNavigationEvents() {

    // Add Account button
    const addAccountBtn = document.getElementById('add-account-btn');
    if (addAccountBtn) {
      addAccountBtn.addEventListener('click', () => {
        const name = prompt('Enter new account name:');
        if (!name) return;
        // Prevent duplicates
        const exists = Array.from(document.querySelectorAll('#accounts-list .account-btn')).some(btn => btn.textContent.trim() === name.trim());
        if (exists) {
          if (typeof showToast === 'function') showToast('Account already exists.', 'error');
          return;
        }
        // Create new button
        const btn = document.createElement('button');
        btn.className = 'account-btn';
        btn.setAttribute('data-account', name.trim());
        btn.textContent = name.trim();
        document.getElementById('accounts-list').appendChild(btn);
        if (typeof showToast === 'function') showToast(`Account "${name.trim()}" added!`, 'success');
      });
    }

        // Account switch buttons (event delegation)
        document.addEventListener('click', (e) => {
          const btn = e.target.closest('.account-btn');
          if (btn && btn.closest('#accounts-list')) {
            e.preventDefault();
            document.querySelectorAll('#accounts-list .account-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAccount = btn.dataset.account || 'all';
            if (typeof showToast === 'function') showToast(`Switched to account: ${btn.textContent.trim()}`, 'info');
            if (currentView === 'dashboard') refreshDashboard();
          }
        });
    // Use event delegation for nav-link clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.nav-link[data-view]');
      if (link) {
        e.preventDefault();
        navigateTo(link.dataset.view);
        // On mobile, close sidebar after navigation
        if (window.innerWidth <= 900) {
          document.getElementById('sidebar').classList.remove('open');
        }
      }
    });

    // Sidebar toggle (mobile)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }

    // Sidebar collapse button
    const sidebarCollapse = document.getElementById('sidebar-collapse');
    if (sidebarCollapse) {
      sidebarCollapse.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }

    // Keyboard navigation for sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && window.innerWidth <= 900) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });

    // Dashboard period selector
    const dashPeriod = document.getElementById('dash-period');
    if (dashPeriod) {
      dashPeriod.addEventListener('change', (e) => {
        const custom = document.getElementById('dash-custom-range');
        custom.classList.toggle('hidden', e.target.value !== 'custom');
        if (e.target.value !== 'custom') refreshDashboard();
      });
    }

    const dashApplyRange = document.getElementById('dash-apply-range');
    if (dashApplyRange) {
      dashApplyRange.addEventListener('click', () => {
        refreshDashboard();
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════════

  async function refreshDashboard() {
    // Filter expenses by currentAccount for dashboard
    // Trend Detection & Anomaly Highlighting Widget
    const trendWidget = document.getElementById('trend-detection-widget');
    if (trendWidget) {
      const { dateStart, dateEnd, year } = getDashboardDateRange();
      let months = await DB.getMonthlyTotals(year);
      if (currentAccount !== 'all') {
        months = months.map(m => ({
          ...m,
          total: m.expenses ? m.expenses.filter(e => e.account === currentAccount).reduce((sum, e) => sum + parseFloat(e.amount), 0) : 0
        }));
      }
      if (months.length > 1) {
        // Calculate month-over-month changes
        let trendHtml = '<div class="card"><h3>Spending Trends & Spikes</h3><ul class="trend-list">';
        let spikes = 0;
        for (let i = 1; i < months.length; i++) {
          const prev = months[i - 1];
          const curr = months[i];
          const change = curr.total - prev.total;
          const pct = prev.total > 0 ? ((change / prev.total) * 100).toFixed(1) : 'N/A';
          let trend = '';
          if (pct !== 'N/A' && Math.abs(change) > prev.total * 0.3 && Math.abs(change) > 100) {
            trend = change > 0 ? '<span style="color:var(--red)">▲ Spike</span>' : '<span style="color:var(--green)">▼ Drop</span>';
            spikes++;
          }
          trendHtml += `<li><strong>${curr.label}</strong>: ${CONFIG.formatCurrency(curr.total)} (${change > 0 ? '+' : ''}${CONFIG.formatCurrency(change)}) ${pct !== 'N/A' ? pct + '%' : ''} ${trend}</li>`;
        }
        trendHtml += `</ul>${spikes === 0 ? '<p class="info-text">No significant spikes detected.</p>' : ''}</div>`;
        trendWidget.innerHTML = trendHtml;
      } else {
        trendWidget.innerHTML = '<div class="card"><h3>Spending Trends & Spikes</h3><p class="info-text">Not enough data to detect trends.</p></div>';
      }
    }
            // Recurring Expenses Widget
            const recurringWidget = document.getElementById('recurring-expenses-widget');
            if (recurringWidget) {
              const { data: allExpenses } = await DB.getExpenses({ dateStart, dateEnd }, { page: 1, pageSize: 10000, sortBy: 'date', sortDir: 'desc' });
              if (allExpenses.length > 0) {
                // Group by vendor and month
                const recurringMap = {};
                allExpenses.forEach(e => {
                  if (!e.vendor) return;
                  const month = e.date ? e.date.slice(0, 7) : '';
                  if (!recurringMap[e.vendor]) recurringMap[e.vendor] = { months: new Set(), total: 0, count: 0 };
                  recurringMap[e.vendor].months.add(month);
                  recurringMap[e.vendor].total += parseFloat(e.amount);
                  recurringMap[e.vendor].count += 1;
                });
                // Recurring = appears in at least 2 different months in the period
                const recurring = Object.entries(recurringMap)
                  .filter(([_, v]) => v.months.size >= 2)
                  .sort((a, b) => b[1].total - a[1].total)
                  .slice(0, 5);
                if (recurring.length === 0) {
                  recurringWidget.innerHTML = '<div class="card"><h3>Recurring Expenses</h3><p class="info-text">No recurring vendors detected.</p></div>';
                } else {
                  recurringWidget.innerHTML = `<div class="card"><h3>Recurring Expenses</h3><ul class="recurring-list">${recurring.map(([vendor, v]) => `<li><strong>${escapeHtml(vendor)}</strong> <span class="text-right">${CONFIG.formatCurrency(v.total)} (${v.months.size} months)</span></li>`).join('')}</ul></div>`;
                }
              } else {
                recurringWidget.innerHTML = '<div class="card"><h3>Recurring Expenses</h3><p class="info-text">No data for this period.</p></div>';
              }
            }
        // Unusual Expenses Widget
        const unusualWidget = document.getElementById('unusual-expenses-widget');
        if (unusualWidget) {
          // Use the same period as dashboard
          const { data: allExpenses } = await DB.getExpenses({ dateStart, dateEnd }, { page: 1, pageSize: 10000, sortBy: 'date', sortDir: 'desc' });
          if (allExpenses.length > 0) {
            // Calculate average and std deviation
            const amounts = allExpenses.map(e => parseFloat(e.amount)).filter(a => !isNaN(a));
            const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const std = Math.sqrt(amounts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / amounts.length);
            // Unusual = > avg + 2*std
            const threshold = avg + 2 * std;
            const unusual = allExpenses.filter(e => parseFloat(e.amount) > threshold);
            if (unusual.length === 0) {
              unusualWidget.innerHTML = '<div class="card"><h3>Unusual Expenses</h3><p class="info-text">No unusual expenses detected.</p></div>';
            } else {
              unusualWidget.innerHTML = `<div class="card"><h3>Unusual Expenses</h3><ul class="unusual-list">${unusual.slice(0, 5).map(e => `<li><strong>${CONFIG.formatDate(e.date)}</strong> — ${escapeHtml(e.vendor || '—')} <span class="text-right">${CONFIG.formatCurrency(e.amount)}</span></li>`).join('')}</ul><p class="info-text">Showing top ${Math.min(5, unusual.length)} (>{CONFIG.formatCurrency(threshold)})</p></div>`;
            }
          } else {
            unusualWidget.innerHTML = '<div class="card"><h3>Unusual Expenses</h3><p class="info-text">No data for this period.</p></div>';
          }
        }
    const { dateStart, dateEnd, year } = getDashboardDateRange();

    // Stats
    const stats = await DB.getStats(dateStart, dateEnd);
    document.getElementById('stat-total').textContent = CONFIG.formatCurrency(stats.total);
    document.getElementById('stat-count').textContent = stats.count.toLocaleString();
    document.getElementById('stat-avg').textContent = CONFIG.formatCurrency(stats.avg);

    // This month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    const monthStats = await DB.getStats(monthStart, monthEnd);
    document.getElementById('stat-month').textContent = CONFIG.formatCurrency(monthStats.total);


    // Charts
    await REPORTS.renderDashboardCharts(dateStart, dateEnd, year);

    // Top Vendors Widget
    const vendorWidget = document.getElementById('top-vendors-widget');
    if (vendorWidget) {
      const { data: topVendors } = await DB.getExpenses({}, { page: 1, pageSize: 10000, sortBy: 'date', sortDir: 'desc' });
      // Aggregate by vendor for the selected period
      const vendorTotals = {};
      topVendors.forEach(e => {
        if (!e.vendor) return;
        vendorTotals[e.vendor] = (vendorTotals[e.vendor] || 0) + parseFloat(e.amount);
      });
      const sorted = Object.entries(vendorTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      if (sorted.length === 0) {
        vendorWidget.innerHTML = '<div class="card"><h3>Top Vendors</h3><p class="info-text">No vendor data yet.</p></div>';
      } else {
        vendorWidget.innerHTML = `<div class="card"><h3>Top Vendors</h3><ol class="top-vendors-list">${sorted.map(([vendor, total]) => `<li><strong>${escapeHtml(vendor)}</strong> <span class="text-right">${CONFIG.formatCurrency(total)}</span></li>`).join('')}</ol></div>`;
      }
    }

    // Recent expenses
    const { data: recent } = await DB.getExpenses({}, {
      page: 1,
      pageSize: CONFIG.recentLimit,
      sortBy: 'date',
      sortDir: 'desc'
    });

    const tbody = document.getElementById('recent-expenses-body');
    if (recent.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No expenses yet — add one to get started.</td></tr>';
    } else {
      tbody.innerHTML = recent.map(e => {
        const cat = CONFIG.getCategory(e.category);
        const tl = CONFIG.getTaxLine(e.tax_line);
        return `
          <tr>
            <td>${CONFIG.formatDate(e.date)}</td>
            <td>${escapeHtml(e.vendor || '—')}</td>
            <td>${cat ? '<span style="color:' + cat.color + '">' + cat.icon + '</span> ' + cat.name : (e.category || '—')}</td>
            <td>${tl ? '<span class="badge badge-gray">L' + tl.line + '</span>' : '—'}</td>
            <td class="text-right"><strong>${CONFIG.formatCurrency(e.amount)}</strong></td>
          </tr>
        `;
      }).join('');
    }
  }

  function getDashboardDateRange() {
    const period = document.getElementById('dash-period').value;
    const now = new Date();
    const year = now.getFullYear();

    switch (period) {
      case 'month': {
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        return {
          dateStart: `${year}-${m}-01`,
          dateEnd: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
          year
        };
      }
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3);
        const qStart = q * 3 + 1;
        const qEnd = qStart + 2;
        const lastDay = new Date(year, qEnd, 0).getDate();
        return {
          dateStart: `${year}-${String(qStart).padStart(2, '0')}-01`,
          dateEnd: `${year}-${String(qEnd).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
          year
        };
      }
      case 'custom': {
        const start = document.getElementById('dash-start').value || `${year}-01-01`;
        const end = document.getElementById('dash-end').value || `${year}-12-31`;
        return { dateStart: start, dateEnd: end, year };
      }
      case 'year':
      default:
        return { dateStart: `${year}-01-01`, dateEnd: `${year}-12-31`, year };
    }
  }

  // ═══════════════════════════════════════════════
  //  EXPENSE LIST
  // ═══════════════════════════════════════════════

  function bindExpenseListEvents() {
    // Filters
    document.getElementById('filter-search').addEventListener('input', debounce(refreshExpenseList, 300));
    document.getElementById('filter-category').addEventListener('change', refreshExpenseList);
    document.getElementById('filter-tax-line').addEventListener('change', refreshExpenseList);
    document.getElementById('filter-date-start').addEventListener('change', refreshExpenseList);
    document.getElementById('filter-date-end').addEventListener('change', refreshExpenseList);
    document.getElementById('filter-amount-min').addEventListener('input', debounce(refreshExpenseList, 300));
    document.getElementById('filter-amount-max').addEventListener('input', debounce(refreshExpenseList, 300));

    // Clear filters
    document.getElementById('clear-filters-btn').addEventListener('click', () => {
      document.getElementById('filter-search').value = '';
      document.getElementById('filter-category').value = '';
      document.getElementById('filter-tax-line').value = '';
      document.getElementById('filter-date-start').value = '';
      document.getElementById('filter-date-end').value = '';
      document.getElementById('filter-amount-min').value = '';
      document.getElementById('filter-amount-max').value = '';
      currentPage = 1;
      refreshExpenseList();
    });

    // Sort headers
    document.querySelectorAll('#expenses-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (currentSort.by === field) {
          currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.by = field;
          currentSort.dir = field === 'date' ? 'desc' : 'asc';
        }
        refreshExpenseList();
      });
    });

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; refreshExpenseList(); }
    });
    document.getElementById('next-page').addEventListener('click', () => {
      currentPage++;
      refreshExpenseList();
    });

    // Select all checkbox
    document.getElementById('select-all-expenses').addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('#expenses-body input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        const id = cb.dataset.id;
        if (e.target.checked) selectedExpenseIds.add(id);
        else selectedExpenseIds.delete(id);
      });
      updateBulkActions();
    });

    // Bulk actions
    document.getElementById('bulk-delete').addEventListener('click', bulkDeleteExpenses);
    document.getElementById('bulk-export').addEventListener('click', bulkExportExpenses);
    document.getElementById('bulk-recategorize').addEventListener('click', bulkRecategorize);
    document.getElementById('bulk-edit').addEventListener('click', bulkEditExpenses);
    document.getElementById('bulk-assign-tax').addEventListener('click', bulkAssignTaxLine);
  // Bulk Edit Expenses
  async function bulkEditExpenses() {
    const ids = Array.from(selectedExpenseIds);
    if (ids.length === 0) return;

    // Show modal to select field and value
    showModal(
      'Bulk Edit Expenses',
      `<p>Edit <strong>${ids.length}</strong> selected expenses.</p>
      <div class="form-group">
        <label for="bulk-edit-field">Field</label>
        <select id="bulk-edit-field">
          <option value="category">Category</option>
          <option value="subcategory">Subcategory</option>
          <option value="payment_method">Payment Method</option>
          <option value="tags">Tags</option>
        </select>
      </div>
      <div class="form-group">
        <label for="bulk-edit-value">Value</label>
        <input type="text" id="bulk-edit-value" />
      </div>`,
      [
        { label: 'Cancel', class: 'btn btn-outline', action: closeModal },
        {
          label: 'Apply', class: 'btn btn-primary', action: async () => {
            const field = document.getElementById('bulk-edit-field').value;
            const value = document.getElementById('bulk-edit-value').value;
            let updated = 0;
            for (const id of ids) {
              const exp = await DB.getExpense(id);
              if (!exp) continue;
              const updates = {};
              updates[field] = value;
              await DB.updateExpense(id, updates);
              updated++;
            }
            showToast(`Updated ${updated} expenses.`, 'success');
            selectedExpenseIds.clear();
            updateBulkActions();
            closeModal();
            refreshExpenseList();
          }
        }
      ]
    );
  }

  // Bulk Assign Tax Line
  async function bulkAssignTaxLine() {
    const ids = Array.from(selectedExpenseIds);
    if (ids.length === 0) return;

    // Show modal to select tax line
    showModal(
      'Bulk Assign Tax Line',
      `<p>Assign IRS Tax Line to <strong>${ids.length}</strong> selected expenses.</p>
      <div class="form-group">
        <label for="bulk-tax-line">Tax Line</label>
        <select id="bulk-tax-line"></select>
      </div>`,
      [
        { label: 'Cancel', class: 'btn btn-outline', action: closeModal },
        {
          label: 'Assign', class: 'btn btn-primary', action: async () => {
            const taxLine = document.getElementById('bulk-tax-line').value;
            let updated = 0;
            for (const id of ids) {
              const exp = await DB.getExpense(id);
              if (!exp) continue;
              await DB.updateExpense(id, { tax_line: taxLine });
              updated++;
            }
            showToast(`Assigned tax line to ${updated} expenses.`, 'success');
            selectedExpenseIds.clear();
            updateBulkActions();
            closeModal();
            refreshExpenseList();
          }
        }
      ]
    );
    // Populate tax line dropdown
    const select = document.getElementById('bulk-tax-line');
    CONFIG.taxLines.forEach(tl => {
      const opt = document.createElement('option');
      opt.value = tl.id;
      opt.textContent = `Line ${tl.line}: ${tl.label}`;
      select.appendChild(opt);
    });
  }

  // Workflow Automation: Auto-categorize and auto-assign tax line for selected expenses
  async function bulkAutoCategorize() {
    const ids = Array.from(selectedExpenseIds);
    let updated = 0;
    for (const id of ids) {
      const exp = await DB.getExpense(id);
      if (!exp) continue;
      const suggestion = CATEGORIZE.suggestCategory(exp.vendor, exp.description, exp.amount);
      if (suggestion && suggestion.confidence >= 65) {
        await CATEGORIZE.applyCategory(id, suggestion.categoryId, suggestion.subcategory, suggestion.taxLine);
        updated++;
      }
    }
    showToast(`Auto-categorized ${updated} of ${ids.length} expenses.`, 'success');
    selectedExpenseIds.clear();
    updateBulkActions();
    refreshExpenseList();
  }

    // Export all
    document.getElementById('export-expenses-btn').addEventListener('click', () => {
      const start = document.getElementById('filter-date-start').value || `${new Date().getFullYear()}-01-01`;
      const end = document.getElementById('filter-date-end').value || `${new Date().getFullYear()}-12-31`;
      REPORTS.exportExpensesToExcel(start, end);
    });
  }

  async function refreshExpenseList() {
    const filters = {
      search: document.getElementById('filter-search').value,
      category: document.getElementById('filter-category').value,
      taxLine: document.getElementById('filter-tax-line').value,
      dateStart: document.getElementById('filter-date-start').value,
      dateEnd: document.getElementById('filter-date-end').value,
      amountMin: document.getElementById('filter-amount-min').value,
      amountMax: document.getElementById('filter-amount-max').value
    };

    const { data, total } = await DB.getExpenses(filters, {
      page: currentPage,
      pageSize: CONFIG.pageSize,
      sortBy: currentSort.by,
      sortDir: currentSort.dir
    });

    const totalPages = Math.ceil(total / CONFIG.pageSize) || 1;

    const tbody = document.getElementById('expenses-body');

    if (data.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No expenses found.</td></tr>';
    } else {
      tbody.innerHTML = data.map(e => {
        const cat = CONFIG.getCategory(e.category);
        const tl = CONFIG.getTaxLine(e.tax_line);
        const pm = CONFIG.paymentMethods.find(p => p.id === e.payment_method);
        const checked = selectedExpenseIds.has(e.id) ? 'checked' : '';

        return `
          <tr data-id="${e.id}">
            <td><input type="checkbox" data-id="${e.id}" ${checked} /></td>
            <td>${CONFIG.formatDate(e.date)}</td>
            <td><strong>${escapeHtml(e.vendor || '—')}</strong></td>
            <td>${cat ? '<span style="color:' + cat.color + '">' + cat.icon + '</span> ' + cat.name : (e.category || '—')}</td>
            <td>${tl ? '<span class="badge badge-purple">L' + tl.line + '</span>' : '<span class="badge badge-orange">Unmapped</span>'}</td>
            <td>${pm ? pm.icon : ''} ${pm ? pm.label : (e.payment_method || '')}</td>
            <td class="text-right"><strong>${CONFIG.formatCurrency(e.amount)}</strong></td>
            <td>${e.receipt_url ? '<i class="fa-solid fa-image receipt-icon" title="View receipt"></i>' : '<i class="fa-solid fa-minus no-receipt"></i>'}</td>
            <td>
              <div class="action-btns">
                <button class="btn-icon edit-expense-btn" data-id="${e.id}" title="Edit">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon delete btn-delete-expense" data-id="${e.id}" title="Delete">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Pagination controls
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages} (${total} total)`;
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;

    // Bind row-level events
    bindExpenseRowEvents();
    updateBulkActions();
  }

  function bindExpenseRowEvents() {
    // Checkbox change
    document.querySelectorAll('#expenses-body input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selectedExpenseIds.add(cb.dataset.id);
        else selectedExpenseIds.delete(cb.dataset.id);
        updateBulkActions();
      });
    });

    // Edit buttons
    document.querySelectorAll('.edit-expense-btn').forEach(btn => {
      btn.addEventListener('click', () => editExpense(btn.dataset.id));
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete-expense').forEach(btn => {
      btn.addEventListener('click', () => {
        confirmDelete([btn.dataset.id]);
      });
    });
  }

  function updateBulkActions() {
    const bar = document.getElementById('bulk-actions');
    const count = selectedExpenseIds.size;
    if (count > 0) {
      bar.classList.remove('hidden');
      document.getElementById('selected-count').textContent = `${count} selected`;
    } else {
      bar.classList.add('hidden');
    }
  }

  async function bulkDeleteExpenses() {
    confirmDelete(Array.from(selectedExpenseIds));
  }

  async function bulkExportExpenses() {
    showToast('Exporting selected expenses...', 'info');

    const ids = Array.from(selectedExpenseIds);
    const expenses = [];
    for (const id of ids) {
      const exp = await DB.getExpense(id);
      if (exp) expenses.push(exp);
    }

    if (expenses.length === 0) {
      showToast('No expenses to export.', 'warning');
      return;
    }

    // Build quick export
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
    XLSX.utils.book_append_sheet(wb, ws, 'Selected Expenses');
    XLSX.writeFile(wb, 'Selected_Expenses.xlsx');

    showToast(`Exported ${expenses.length} expenses.`, 'success');
  }

  async function bulkRecategorize() {
    // Show modal to choose between auto-categorize or manual
    showModal(
      'Bulk Re-categorize',
      `<p>Choose how to re-categorize <strong>${selectedExpenseIds.size}</strong> expenses:</p>
      <div class="form-group">
        <button class="btn btn-primary" id="auto-categorize-btn">Auto-Categorize (AI)</button>
        <button class="btn btn-outline" id="manual-categorize-btn">Manual</button>
      </div>`,
      [
        { label: 'Cancel', class: 'btn btn-outline', action: closeModal }
      ]
    );
    document.getElementById('auto-categorize-btn').addEventListener('click', async () => {
      closeModal();
      await bulkAutoCategorize();
    });
    document.getElementById('manual-categorize-btn').addEventListener('click', async () => {
      closeModal();
      // Manual: open bulk edit modal for category
      await bulkEditExpenses();
    });
  }

  function confirmDelete(ids) {
    showModal(
      'Confirm Deletion',
      `<p>Are you sure you want to delete <strong>${ids.length}</strong> expense${ids.length > 1 ? 's' : ''}? This cannot be undone.</p>`,
      [
        { label: 'Cancel', class: 'btn btn-outline', action: closeModal },
        {
          label: 'Delete', class: 'btn btn-danger', action: async () => {
            await DB.deleteExpenses(ids);
            showToast(`Deleted ${ids.length} expense${ids.length > 1 ? 's' : ''}.`, 'success');
            selectedExpenseIds.clear();
            updateBulkActions();
            closeModal();
            refreshExpenseList();
          }
        }
      ]
    );
  }

  // ═══════════════════════════════════════════════
  //  EXPENSE FORM (Add / Edit)
  // ═══════════════════════════════════════════════

  function bindExpenseFormEvents() {
    const form = document.getElementById('expense-form');

    // Form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveExpense(false);
    });

    // Save & add another
    document.getElementById('save-and-new').addEventListener('click', async () => {
      await saveExpense(true);
    });

    // Cancel
    document.getElementById('cancel-expense').addEventListener('click', () => {
      navigateTo('expenses');
    });

    // Category change → update subcategories + tax line
    document.getElementById('exp-op-category').addEventListener('change', (e) => {
      updateSubcategories(e.target.value);
      autoSetTaxLine(e.target.value);
    });

    // Subcategory change → refine tax line
    document.getElementById('exp-subcategory').addEventListener('change', () => {
      const cat = document.getElementById('exp-op-category').value;
      const sub = document.getElementById('exp-subcategory').value;
      if (cat && sub) {
        const taxLine = CATEGORIZE.getTaxLineForExpense(cat, sub);
        if (taxLine) {
          document.getElementById('exp-tax-line').value = taxLine.id;
        }
      }
    });

    // Vendor change → auto-suggest category
    document.getElementById('exp-vendor').addEventListener('input', debounce(() => {
      const vendor = document.getElementById('exp-vendor').value;
      const desc = document.getElementById('exp-description').value;
      if (vendor.length >= 3) {
        showAutoSuggestion(vendor, desc);
      }
    }, 400));

    // Accept auto-suggestion
    document.getElementById('accept-suggestion').addEventListener('click', () => {
      const banner = document.getElementById('auto-cat-suggestion');
      const catId = banner.dataset.categoryId;
      const subcat = banner.dataset.subcategory || '';
      const taxLine = banner.dataset.taxLine || '';

      if (catId) {
        document.getElementById('exp-op-category').value = catId;
        updateSubcategories(catId);
        if (subcat) document.getElementById('exp-subcategory').value = subcat;
        if (taxLine) document.getElementById('exp-tax-line').value = taxLine;
      }
      banner.classList.add('hidden');
    });

    // Dismiss suggestion
    document.getElementById('dismiss-suggestion').addEventListener('click', () => {
      document.getElementById('auto-cat-suggestion').classList.add('hidden');
    });

    // Receipt upload
    const dropZone = document.getElementById('receipt-drop-zone');
    const fileInput = document.getElementById('receipt-file-input');

    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleReceiptAttach(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleReceiptAttach(e.dataTransfer.files[0]);
    });

    document.getElementById('remove-receipt').addEventListener('click', () => {
      receiptFile = null;
      receiptDataUrl = null;
      document.getElementById('receipt-preview').classList.add('hidden');
      document.getElementById('receipt-drop-zone').classList.remove('hidden');
      document.getElementById('receipt-file-input').value = '';
    });
  }

  function prepareExpenseForm(expenseId) {
    editingExpenseId = expenseId || null;
    const form = document.getElementById('expense-form');
    form.reset();

    document.getElementById('expense-form-title').textContent = expenseId ? 'Edit Expense' : 'Add Expense';
    document.getElementById('expense-id').value = expenseId || '';
    document.getElementById('auto-cat-suggestion').classList.add('hidden');
    document.getElementById('receipt-preview').classList.add('hidden');
    document.getElementById('receipt-drop-zone').classList.remove('hidden');

    receiptFile = null;
    receiptDataUrl = null;

    // Set default date to today
    if (!expenseId) {
      document.getElementById('exp-date').value = new Date().toISOString().slice(0, 10);
      document.getElementById('exp-payment').value = CONFIG.defaultPaymentMethod;
    }

    // Reset subcategories
    document.getElementById('exp-subcategory').innerHTML = '<option value="">None</option>';
  }

  async function editExpense(id) {
    if (!AUTH.requirePermission('write', 'edit expenses')) return;

    const expense = await DB.getExpense(id);
    if (!expense) {
      showToast('Expense not found.', 'error');
      return;
    }

    navigateTo('add-expense');
    prepareExpenseForm(id);

    // Populate form
    document.getElementById('exp-date').value = expense.date || '';
    document.getElementById('exp-vendor').value = expense.vendor || '';
    document.getElementById('exp-amount').value = expense.amount || '';
    document.getElementById('exp-payment').value = expense.payment_method || 'card';
    document.getElementById('exp-op-category').value = expense.category || '';
    document.getElementById('exp-check-num').value = expense.check_number || '';
    document.getElementById('exp-description').value = expense.description || '';
    document.getElementById('exp-tags').value = expense.tags || '';

    if (expense.category) {
      updateSubcategories(expense.category);
      if (expense.subcategory) {
        document.getElementById('exp-subcategory').value = expense.subcategory;
      }
    }

    if (expense.tax_line) {
      document.getElementById('exp-tax-line').value = expense.tax_line;
    }

    // Show receipt if exists
    if (expense.receipt_url) {
      receiptDataUrl = expense.receipt_url;
      document.getElementById('receipt-thumb').src = expense.receipt_url;
      document.getElementById('receipt-preview').classList.remove('hidden');
      document.getElementById('receipt-drop-zone').classList.add('hidden');
    }
  }

  async function saveExpense(addAnother) {
    if (!AUTH.requirePermission('write', 'save expenses')) return;

    const id = document.getElementById('expense-id').value;
    const vendor = document.getElementById('exp-vendor').value.trim();
    const category = document.getElementById('exp-op-category').value;
    const subcategory = document.getElementById('exp-subcategory').value;

    // Get suggestion if present
    let suggestion = null;
    const banner = document.getElementById('auto-cat-suggestion');
    if (banner && !banner.classList.contains('hidden')) {
      suggestion = {
        categoryId: banner.dataset.categoryId,
        subcategory: banner.dataset.subcategory,
        taxLine: banner.dataset.taxLine
      };
    }
    let taxLine = document.getElementById('exp-tax-line').value;

    // Auto-detect tax line if empty
    if (!taxLine && category) {
      const tl = CATEGORIZE.getTaxLineForExpense(category, subcategory);
      if (tl) taxLine = tl.id;
    }

    const expenseData = {
      date: document.getElementById('exp-date').value,
      vendor: vendor,
      amount: document.getElementById('exp-amount').value,
      payment_method: document.getElementById('exp-payment').value,
      category: category,
      subcategory: subcategory,
      tax_line: taxLine,
      check_number: document.getElementById('exp-check-num').value.trim(),
      description: document.getElementById('exp-description').value.trim(),
      tags: document.getElementById('exp-tags').value.trim(),
      user_id: AUTH.getUserId(),
      user_name: AUTH.getUserName()
    };

    try {
      let saved;
      if (id) {
        saved = await DB.updateExpense(id, expenseData);
        showToast('Expense updated.', 'success');
      } else {
        // Upload receipt if present
        if (receiptFile) {
          const tempId = DB.generateId();
          const receiptResult = await DB.uploadReceipt(receiptFile, tempId);
          expenseData.receipt_url = receiptResult.url || '';
          expenseData.receipt_path = receiptResult.path || '';
        }

        saved = await DB.createExpense(expenseData);
        showToast('Expense saved!', 'success');
      }

      // Learn categorization, track corrections
      if (vendor && category) {
        CATEGORIZE.learn(vendor, category, subcategory, suggestion);
      }

      // Update vendor suggestions
      await populateVendorSuggestions();

      if (addAnother) {
        prepareExpenseForm();
      } else {
        navigateTo('expenses');
      }
    } catch (e) {
      showToast('Failed to save expense: ' + e.message, 'error');
    }
  }

  async function handleReceiptAttach(file) {
    const validation = OCR.validateFile(file);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    receiptFile = file;
    receiptDataUrl = await OCR.fileToDataURL(file);

    document.getElementById('receipt-thumb').src = receiptDataUrl;
    document.getElementById('receipt-preview').classList.remove('hidden');
    document.getElementById('receipt-drop-zone').classList.add('hidden');

    // Quick auto-suggest from vendor name if possible
    // (Full OCR happens in the Scanner view)
  }

  function showAutoSuggestion(vendor, description) {
    const suggestion = CATEGORIZE.suggestCategory(vendor, description);
    const banner = document.getElementById('auto-cat-suggestion');

    if (suggestion && suggestion.confidence >= 60) {
      const text = document.querySelector('#auto-cat-text strong');
      text.textContent = `${suggestion.icon || ''} ${suggestion.categoryName || suggestion.categoryId}`;

      if (suggestion.subcategory) {
        text.textContent += ` → ${suggestion.subcategory}`;
      }

      banner.dataset.categoryId = suggestion.categoryId;
      banner.dataset.subcategory = suggestion.subcategory || '';
      banner.dataset.taxLine = suggestion.taxLine || '';
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  function updateSubcategories(categoryId) {
    const select = document.getElementById('exp-subcategory');
    select.innerHTML = '<option value="">None</option>';

    const cat = CONFIG.getCategory(categoryId);
    if (cat && cat.subcategories.length > 0) {
      cat.subcategories.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        select.appendChild(opt);
      });
    }
  }

  function autoSetTaxLine(categoryId) {
    const cat = CONFIG.getCategory(categoryId);
    if (cat) {
      document.getElementById('exp-tax-line').value = cat.defaultTaxLine;
    }
  }

  // ═══════════════════════════════════════════════
  //  RECEIPT SCANNER
  // ═══════════════════════════════════════════════

  function bindReceiptScanEvents() {
    const dropZone = document.getElementById('ocr-drop-zone');
    const fileInput = document.getElementById('ocr-file-input');

    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) processReceiptScan(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) processReceiptScan(e.dataTransfer.files[0]);
    });

    // Create expense from OCR
    document.getElementById('ocr-create-expense').addEventListener('click', createExpenseFromOCR);

    // Discard OCR results
    document.getElementById('ocr-discard').addEventListener('click', resetOCRView);
  }

  async function processReceiptScan(file) {
    const validation = OCR.validateFile(file);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    // Show progress
    document.getElementById('ocr-progress').classList.remove('hidden');
    document.getElementById('ocr-results').classList.add('hidden');
    document.getElementById('ocr-drop-zone').classList.add('hidden');

    const result = await OCR.processReceipt(file, (status, pct) => {
      document.getElementById('ocr-progress-fill').style.width = pct + '%';
      document.getElementById('ocr-status-text').textContent = status;
    });

    document.getElementById('ocr-progress').classList.add('hidden');

    if (!result.success) {
      showToast('OCR failed: ' + (result.error || 'Unknown error'), 'error');
      resetOCRView();
      return;
    }

    // Show results
    const quality = OCR.assessQuality(result);
    showToast(OCR.getQualityMessage(quality), quality === 'low' ? 'warning' : 'success');

    // Preview image
    const previewUrl = await OCR.fileToDataURL(file);
    document.getElementById('ocr-preview-img').src = previewUrl;

    // Populate fields
    document.getElementById('ocr-vendor').value = result.vendor || '';
    document.getElementById('ocr-date').value = result.date || '';
    document.getElementById('ocr-total').value = result.total || '';
    document.getElementById('ocr-category').value = result.suggestedCategory
      ? (result.suggestedCategory.icon || '') + ' ' + (result.suggestedCategory.categoryName || '')
      : 'No suggestion';
    document.getElementById('ocr-raw-text').value = result.rawText || '';

    // Line items
    const lineBody = document.getElementById('ocr-line-items-body');
    if (result.lineItems && result.lineItems.length > 0) {
      lineBody.innerHTML = result.lineItems.map(item => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${item.quantity}</td>
          <td class="text-right">${CONFIG.formatCurrency(item.price)}</td>
        </tr>
      `).join('');
    } else {
      lineBody.innerHTML = '<tr><td colspan="3" class="text-center" style="color:var(--gray-400)">No line items detected</td></tr>';
    }

    // Store file reference for expense creation
    receiptFile = file;
    receiptDataUrl = previewUrl;

    document.getElementById('ocr-results').classList.remove('hidden');
  }

  async function createExpenseFromOCR() {
    if (!AUTH.requirePermission('write', 'create expenses')) return;

    const lastResult = OCR.getLastResult();
    if (!lastResult) return;

    // Navigate to expense form with pre-filled data
    navigateTo('add-expense');
    prepareExpenseForm();

    // Fill from OCR fields (user may have edited them)
    document.getElementById('exp-date').value = document.getElementById('ocr-date').value;
    document.getElementById('exp-vendor').value = document.getElementById('ocr-vendor').value;
    document.getElementById('exp-amount').value = document.getElementById('ocr-total').value;

    // Apply auto-categorization
    if (lastResult.suggestedCategory) {
      const s = lastResult.suggestedCategory;
      if (s.categoryId) {
        document.getElementById('exp-op-category').value = s.categoryId;
        updateSubcategories(s.categoryId);
        if (s.subcategory) document.getElementById('exp-subcategory').value = s.subcategory;
        if (s.taxLine) document.getElementById('exp-tax-line').value = s.taxLine;
      }
    }

    // Payment method
    if (lastResult.paymentMethod) {
      document.getElementById('exp-payment').value = lastResult.paymentMethod;
    }

    // Description from line items
    const expenseData = OCR.toExpenseData(lastResult);
    if (expenseData && expenseData.description) {
      document.getElementById('exp-description').value = expenseData.description;
    }

    // Attach receipt image
    if (receiptFile) {
      document.getElementById('receipt-thumb').src = receiptDataUrl;
      document.getElementById('receipt-preview').classList.remove('hidden');
      document.getElementById('receipt-drop-zone').classList.add('hidden');
    }

    showToast('Receipt data loaded into form. Review and save.', 'info');
  }

  function resetOCRView() {
    document.getElementById('ocr-progress').classList.add('hidden');
    document.getElementById('ocr-results').classList.add('hidden');
    document.getElementById('ocr-drop-zone').classList.remove('hidden');
    document.getElementById('ocr-file-input').value = '';
  }

  // ═══════════════════════════════════════════════
  //  CATEGORIES VIEW
  // ═══════════════════════════════════════════════

  async function refreshCategoriesView() {
    // Operational categories
    const opBody = document.getElementById('op-categories-body');
    opBody.innerHTML = CONFIG.operationalCategories.map(cat => {
      const tl = CONFIG.getTaxLine(cat.defaultTaxLine);
      return `
        <tr>
          <td><span style="color:${cat.color}">${cat.icon}</span> <strong>${cat.name}</strong></td>
          <td>${cat.subcategories.slice(0, 4).join(', ')}${cat.subcategories.length > 4 ? ` (+${cat.subcategories.length - 4} more)` : ''}</td>
          <td>${tl ? '<span class="badge badge-purple">L' + tl.line + '</span> ' + tl.label : '—'}</td>
          <td><span class="badge badge-gray">${cat.id}</span></td>
        </tr>
      `;
    }).join('');

    // Tax lines
    const taxBody = document.getElementById('tax-lines-body');
    taxBody.innerHTML = CONFIG.taxLines.map(tl => {
      const mappedCats = CONFIG.getCategoriesForTaxLine(tl.id);
      return `
        <tr>
          <td><strong>Line ${tl.line}</strong></td>
          <td>${tl.label}</td>
          <td>${mappedCats.map(c => '<span style="color:' + c.color + '">' + c.icon + '</span> ' + c.name).join(', ') || '<em>None</em>'}</td>
        </tr>
      `;
    }).join('');
  }

  // ═══════════════════════════════════════════════
  //  REPORTS VIEW
  // ═══════════════════════════════════════════════

  function bindReportEvents() {
    document.getElementById('generate-report-btn').addEventListener('click', async () => {
      const type = document.getElementById('report-type').value;
      const year = parseInt(document.getElementById('report-year').value) || new Date().getFullYear();

      const output = document.getElementById('report-output');
      output.innerHTML = '<p class="info-text"><i class="fa-solid fa-spinner fa-spin"></i> Generating report...</p>';

      const report = await REPORTS.generateReport(type, { year });

      if (report.error) {
        output.innerHTML = `<p class="info-text" style="color:var(--red)">${report.error}</p>`;
        return;
      }

      output.innerHTML = report.html;

      // Render chart
      const chartContainer = document.getElementById('report-chart-container');
      if (report.chartData) {
        chartContainer.classList.remove('hidden');
        REPORTS.renderChart('report-chart', report.chartData);
      } else {
        chartContainer.classList.add('hidden');
      }
    });

    document.getElementById('export-report-btn').addEventListener('click', () => {
      const type = document.getElementById('report-type').value;
      const year = parseInt(document.getElementById('report-year').value) || new Date().getFullYear();
      REPORTS.exportReportToExcel(type, { year });
    });
  }

  // ═══════════════════════════════════════════════
  //  TAX CENTER
  // ═══════════════════════════════════════════════

  function bindTaxCenterEvents() {
    document.getElementById('generate-tax-report-btn').addEventListener('click', async () => {
      const year = parseInt(document.getElementById('tax-year').value) || new Date().getFullYear();
      const report = await REPORTS.generateTaxReport(year);

      // Schedule F table
      const sfBody = document.getElementById('schedule-f-body');
      sfBody.innerHTML = report.lines
        .filter(l => l.total > 0)
        .map(l => `
          <tr>
            <td><strong>Line ${l.line}</strong></td>
            <td>${l.label}</td>
            <td class="text-right"><strong>${CONFIG.formatCurrency(l.total)}</strong></td>
            <td class="text-right">${l.count}</td>
          </tr>
        `).join('');

      if (sfBody.innerHTML === '') {
        sfBody.innerHTML = '<tr class="empty-row"><td colspan="4">No expenses found for this tax year.</td></tr>';
      }

      document.getElementById('schedule-f-total').textContent = CONFIG.formatCurrency(report.grandTotal);

      // Unmapped warning
      const unmappedSection = document.getElementById('unmapped-warning');
      if (report.unmapped.length > 0) {
        unmappedSection.classList.remove('hidden');
        document.getElementById('unmapped-expenses-body').innerHTML = report.unmapped.map(e => {
          const cat = CONFIG.getCategory(e.category);
          return `
            <tr>
              <td>${CONFIG.formatDate(e.date)}</td>
              <td>${escapeHtml(e.vendor || '—')}</td>
              <td>${cat ? cat.icon + ' ' + cat.name : (e.category || '—')}</td>
              <td class="text-right">${CONFIG.formatCurrency(e.amount)}</td>
              <td>
                <button class="btn btn-sm btn-primary fix-mapping-btn" data-id="${e.id}">
                  <i class="fa-solid fa-wand-magic-sparkles"></i> Fix
                </button>
              </td>
            </tr>
          `;
        }).join('');

        // Bind fix buttons
        document.querySelectorAll('.fix-mapping-btn').forEach(btn => {
          btn.addEventListener('click', () => editExpense(btn.dataset.id));
        });
      } else {
        unmappedSection.classList.add('hidden');
      }
    });

    document.getElementById('export-tax-report-btn').addEventListener('click', () => {
      const year = parseInt(document.getElementById('tax-year').value) || new Date().getFullYear();
      REPORTS.exportTaxReportToExcel(year);
    });
  }

  // ═══════════════════════════════════════════════
  //  SETTINGS
  // ═══════════════════════════════════════════════

  function bindSettingsEvents() {
    document.getElementById('save-settings-btn').addEventListener('click', async () => {
      const settings = {
        farm_name: document.getElementById('farm-name').value.trim(),
        ein: document.getElementById('farm-ein').value.trim(),
        fiscal_year_start: parseInt(document.getElementById('fiscal-year-start').value),
        default_payment: document.getElementById('default-payment').value
      };

      await DB.saveSettings(settings);
      showToast('Settings saved.', 'success');
    });
  }

  async function loadSettings() {
    const settings = await DB.getSettings();
    document.getElementById('farm-name').value = settings.farm_name || '';
    document.getElementById('farm-ein').value = settings.ein || '';
    document.getElementById('fiscal-year-start').value = settings.fiscal_year_start || 1;
    document.getElementById('default-payment').value = settings.default_payment || 'card';
  }

  // ═══════════════════════════════════════════════
  //  USER MANAGEMENT
  // ═══════════════════════════════════════════════

  function bindUserManagementEvents() {
    document.getElementById('invite-user-btn').addEventListener('click', () => {
      showModal(
        'Invite User',
        `<p>Share this app URL with the new user. They can create an account using the sign-up form.</p>
         <p style="margin-top:0.75rem"><strong>App URL:</strong></p>
         <input type="text" value="${window.location.href}" readonly style="width:100%" onclick="this.select()" />`,
        [{ label: 'Close', class: 'btn btn-primary', action: closeModal }]
      );
    });
  }

  async function refreshUsersList() {
    if (!AUTH.canManageUsers()) return;

    const users = await AUTH.getAllUsers();
    const tbody = document.getElementById('users-body');

    if (users.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const roleInfo = CONFIG.roles[u.role];
      const isCurrentUser = u.id === AUTH.getUserId();
      const statusBadge = u.status === 'active'
        ? '<span class="badge badge-green">Active</span>'
        : '<span class="badge badge-red">Inactive</span>';

      return `
        <tr>
          <td><strong>${escapeHtml(u.name)}</strong>${isCurrentUser ? ' <span class="badge badge-blue">You</span>' : ''}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>
            <select class="input-sm user-role-select" data-user-id="${u.id}" ${isCurrentUser && u.role === 'owner' ? 'disabled' : ''}>
              ${Object.entries(CONFIG.roles).map(([key, val]) =>
                `<option value="${key}" ${key === u.role ? 'selected' : ''}>${val.label}</option>`
              ).join('')}
            </select>
          </td>
          <td>${statusBadge}</td>
          <td>
            ${!isCurrentUser ? `
              <button class="btn btn-sm ${u.status === 'active' ? 'btn-outline deactivate-user-btn' : 'btn-primary activate-user-btn'}"
                data-user-id="${u.id}">
                ${u.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    // Bind role change
    document.querySelectorAll('.user-role-select').forEach(select => {
      select.addEventListener('change', async () => {
        const result = await AUTH.updateUserRole(select.dataset.userId, select.value);
        if (result.error) {
          showToast(result.error, 'error');
          refreshUsersList();
        } else {
          showToast('User role updated.', 'success');
        }
      });
    });

    // Bind deactivate
    document.querySelectorAll('.deactivate-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const result = await AUTH.deactivateUser(btn.dataset.userId);
        if (result.error) showToast(result.error, 'error');
        else {
          showToast('User deactivated.', 'success');
          refreshUsersList();
        }
      });
    });
  }

  // ═══════════════════════════════════════════════
  //  DROPDOWN POPULATORS
  // ═══════════════════════════════════════════════

  function populateCategoryDropdowns() {
    const selects = [
      document.getElementById('exp-op-category'),
      document.getElementById('filter-category')
    ];

    selects.forEach(select => {
      if (!select) return;
      // Keep first option
      const firstOption = select.querySelector('option');
      select.innerHTML = '';
      if (firstOption) select.appendChild(firstOption);

      CONFIG.operationalCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = `${cat.icon} ${cat.name}`;
        select.appendChild(opt);
      });
    });
  }

  function populateTaxLineDropdowns() {
    const selects = [
      document.getElementById('exp-tax-line'),
      document.getElementById('filter-tax-line')
    ];

    selects.forEach(select => {
      if (!select) return;
      const firstOption = select.querySelector('option');
      select.innerHTML = '';
      if (firstOption) select.appendChild(firstOption);

      CONFIG.taxLines.forEach(tl => {
        const opt = document.createElement('option');
        opt.value = tl.id;
        opt.textContent = `Line ${tl.line}: ${tl.label}`;
        select.appendChild(opt);
      });
    });
  }

  function populateYearDropdowns() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y);
    }

    ['report-year', 'tax-year'].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      select.innerHTML = years.map(y =>
        `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`
      ).join('');
    });
  }

  async function populateVendorSuggestions() {
    const vendors = await DB.getDistinctVendors();
    const datalist = document.getElementById('vendor-suggestions');
    if (!datalist) return;

    datalist.innerHTML = vendors.map(v =>
      `<option value="${escapeHtml(v)}">`
    ).join('');
  }

  // ═══════════════════════════════════════════════
  //  MODALS
  // ═══════════════════════════════════════════════

  function bindModalEvents() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });
  }

  function showModal(title, bodyHtml, buttons = []) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;

    const footer = document.getElementById('modal-footer');
    footer.innerHTML = '';
    buttons.forEach(btn => {
      const el = document.createElement('button');
      el.className = btn.class || 'btn';
      el.textContent = btn.label;
      el.addEventListener('click', btn.action);
      footer.appendChild(el);
    });

    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    // Focus management: focus first focusable element in modal
    setTimeout(() => {
      const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length) focusable[0].focus();
    }, 10);
    // Store previously focused element
    overlay._lastActive = document.activeElement;
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    // Restore focus to previously focused element
    if (overlay._lastActive) {
      setTimeout(() => overlay._lastActive.focus(), 10);
      overlay._lastActive = null;
    }
  }

  // ═══════════════════════════════════════════════
  //  TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════════

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: 'fa-circle-check',
      error:   'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info:    'fa-circle-info'
    };

    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${escapeHtml(message)}`;
    container.appendChild(toast);

    // Auto-remove after animation
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 4000);
  }

  // ═══════════════════════════════════════════════
  //  SYNC STATUS BADGE
  // ═══════════════════════════════════════════════

  function updateSyncBadge(status) {
    const badge = document.getElementById('sync-status');
    const iconMap = {
      synced:  { icon: 'fa-cloud', text: 'Synced',   color: 'var(--green)' },
      syncing: { icon: 'fa-cloud-arrow-up', text: 'Syncing...', color: 'var(--blue)' },
      offline: { icon: 'fa-cloud-slash', text: 'Offline',  color: 'var(--orange)' },
      partial: { icon: 'fa-cloud-exclamation', text: 'Partial Sync', color: 'var(--orange)' },
      local:   { icon: 'fa-hard-drive', text: 'Local Only', color: 'var(--gray-400)' }
    };

    const info = iconMap[status] || iconMap.local;
    badge.innerHTML = `<i class="fa-solid ${info.icon}" style="color:${info.color}"></i> ${info.text}`;
    badge.title = `Status: ${info.text}`;
  }

  // ═══════════════════════════════════════════════
  //  KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      // Ctrl/Cmd + N → New Expense
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigateTo('add-expense');
      }

      // Escape → Close modal or go to dashboard
      if (e.key === 'Escape') {
        if (!document.getElementById('modal-overlay').classList.contains('hidden')) {
          closeModal();
        }
      }

       // Alt + 1-7 → Quick nav
      if (e.key >= '1' && e.key <= '7' && e.altKey) {
        e.preventDefault();
        const views = ['dashboard', 'expenses', 'add-expense', 'receipt-scan', 'categories', 'reports', 'tax-center'];
        const idx = parseInt(e.key) - 1;
        if (views[idx]) navigateTo(views[idx]);
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  UTILITY HELPERS
  // ═══════════════════════════════════════════════

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ═══════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════
  return {
    init,
    navigateTo,
    showToast,
    showModal,
    closeModal,
    refreshDashboard,
    refreshExpenseList
  };

})();

// ─── BOOT ───
document.addEventListener('DOMContentLoaded', () => {
  APP.init();
});
