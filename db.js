// Local storage helpers
function localGetAll(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function localSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
/**
 * Add test data for development/demo
 */
async function addTestData() {
  // Example test data
  const testExpenses = [
    {
      vendor: 'Tractor Supply Co.',
      amount: 120.50,
      date: new Date().toISOString().slice(0, 10),
      category: 'feed_nutrition',
      tax_line: 'feed',
      payment_method: 'card',
      description: 'Feed and supplies'
    },
    {
      vendor: 'John Deere',
      amount: 350.00,
      date: new Date().toISOString().slice(0, 10),
      category: 'equipment_repair',
      tax_line: 'repairs',
      payment_method: 'check',
      description: 'Tractor repair'
    }
  ];
  for (const exp of testExpenses) {
    await createExpense(exp);
    if (!supabase) {
      // Immediately commit to localStorage in local mode
      let expenses = localGetAll(LOCAL_KEYS.expenses);
      expenses.push({ ...exp, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      localSet(LOCAL_KEYS.expenses, expenses);
    }
  }

}

/**
 * Remove all test/demo expenses from localStorage
 */
async function removeTestData() {
  // For demo: clear all expenses (or optionally filter by known test vendors)
  if (supabase) {
    // Not implemented for Supabase
    return;
  }
  let expenses = localGetAll(LOCAL_KEYS.expenses);
  // Remove only test data by vendor name
  expenses = expenses.filter(e => !['Tractor Supply Co.', 'John Deere'].includes(e.vendor));
  localSet(LOCAL_KEYS.expenses, expenses);
}

// Export to DB namespace if using module pattern
if (typeof window !== 'undefined') {
  window.DB = window.DB || {};
  window.DB.addTestData = addTestData;
  window.DB.removeTestData = removeTestData;
  window.DB.getExpense = getExpense;
  // ...add other exports as needed
}
/**
 * Get a single expense by ID
 */
async function getExpense(id) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('DB: Supabase getExpense failed', e);
      return null;
    }
  } else {
    const expenses = localGetAll(LOCAL_KEYS.expenses);
    return expenses.find(e => e.id === id) || null;
  }
}
/* ═══════════════════════════════════════════════
   DB.JS — Supabase Data Layer & Cloud Sync
   Boles West Run Ranch — Expense Tracker
   ═══════════════════════════════════════════════ */

const DB = (() => {

  // ─── SUPABASE CLIENT INIT ───
  let supabase = null;

  // ═══════════════════════════════════════════════
  //  LOCAL STORAGE FALLBACK
  //  Full offline support when Supabase is unavailable
  // ═══════════════════════════════════════════════
  const LOCAL_KEYS = {
    expenses:   'bwrr_expenses',
    categories: 'bwrr_categories',
    settings:   'bwrr_settings',
    users:      'bwrr_users',
    syncQueue:  'bwrr_sync_queue'
  };

  function init() {
    if (supabase) return supabase;
    const { url, anonKey } = CONFIG.supabase;
    if (!url || !anonKey || anonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZXFnbXN4cnp6a3Z1YWVtYmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDU5MzQsImV4cCI6MjA5MjI4MTkzNH0.5fWzmueq5meEAb5ZT7rUqNH033YW0E_AhgQefevEd4E') {
      console.warn('DB: Supabase not configured — running in local-only mode.');
      return null;
    }
    supabase = window.supabase
      ? window.supabase.createClient(url, anonKey)
      : null;

    if (!supabase) {
      console.warn('DB: Supabase JS library not loaded — running in local-only mode.');
    }
    return supabase;
  }


  // ═══════════════════════════════════════════════

  /**
   * Get expenses with optional filters, pagination, and sorting
   */
  async function getExpenses(filters = {}, options = {}) {
    // Defaults
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const sortBy = options.sortBy || 'date';
    const sortDir = options.sortDir || 'desc';

    let expenses = localGetAll(LOCAL_KEYS.expenses);

    // Filtering
    if (filters.category) {
      expenses = expenses.filter(e => e.category === filters.category);
    }
    if (filters.taxLine) {
      expenses = expenses.filter(e => e.tax_line === filters.taxLine);
    }
    if (filters.dateStart) {
      expenses = expenses.filter(e => e.date >= filters.dateStart);
    }
    if (filters.dateEnd) {
      expenses = expenses.filter(e => e.date <= filters.dateEnd);
    }
    if (filters.amountMin) {
      expenses = expenses.filter(e => e.amount >= parseFloat(filters.amountMin));
    }
    if (filters.amountMax) {
      expenses = expenses.filter(e => e.amount <= parseFloat(filters.amountMax));
    }

    // Sort
    expenses.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'amount') { valA = parseFloat(valA); valB = parseFloat(valB); }
      if (sortDir === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    const total = expenses.length;
    const start = (page - 1) * pageSize;
    const paged = expenses.slice(start, start + pageSize);

    return { data: paged, total };
  }


  /**
   * Create a new expense
   */
  async function createExpense(expense) {
    const record = {
      ...expense,
      id: expense.id || generateId(),
      created_at: expense.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('expenses').insert(record);
        if (error) throw error;
      } catch (e) {
        console.warn('DB: Supabase insert failed — queued for sync', e);
        queueSync('insert', 'expenses', record);
      }

    } else {
      // Local-only: commit to localStorage immediately
      let expenses = localGetAll(LOCAL_KEYS.expenses);
      expenses.push(record);
      localSet(LOCAL_KEYS.expenses, expenses);
    }

    return record;
  }

  /**
   * Update an existing expense
   */
  async function updateExpense(id, updates) {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.amount !== undefined) {
      updatedData.amount = parseFloat(updates.amount);
    }

    // Update locally
    const expenses = localGetAll(LOCAL_KEYS.expenses);
    const idx = expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      expenses[idx] = { ...expenses[idx], ...updatedData };
      localSet(LOCAL_KEYS.expenses, expenses);
    }

    // Try Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from('expenses')
          .update(updatedData)
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.warn('DB: Supabase update failed — queued for sync', e);
        queueSync('update', 'expenses', { id, ...updatedData });
      }
    } else {
      queueSync('update', 'expenses', { id, ...updatedData });
    }

    return expenses[idx] || updatedData;
  }

  /**
   * Delete one or more expenses
   */
  async function deleteExpenses(ids) {
    if (!Array.isArray(ids)) ids = [ids];

    // Delete locally
    let expenses = localGetAll(LOCAL_KEYS.expenses);
    expenses = expenses.filter(e => !ids.includes(e.id));
    localSet(LOCAL_KEYS.expenses, expenses);

    // Try Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .in('id', ids);
        if (error) throw error;
      } catch (e) {
        console.warn('DB: Supabase delete failed — queued for sync', e);
        ids.forEach(id => queueSync('delete', 'expenses', { id }));
      }
    } else {
      ids.forEach(id => queueSync('delete', 'expenses', { id }));
    }

    return true;
  }

  // ═══════════════════════════════════════════════
  //  AGGREGATION QUERIES
  // ═══════════════════════════════════════════════

  /**
   * Get summary statistics for a date range
   */
  async function getStats(dateStart, dateEnd) {
    const { data } = await getExpenses(
      { dateStart, dateEnd },
      { page: 1, pageSize: 100000, sortBy: 'date', sortDir: 'desc' }
    );

    const total = data.reduce((sum, e) => sum + e.amount, 0);
    const count = data.length;
    const avg = count > 0 ? total / count : 0;

    return { total, count, avg, expenses: data };
  }

  /**
   * Get totals grouped by category for a date range
   */
  async function getTotalsByCategory(dateStart, dateEnd) {
    const { expenses } = await getStats(dateStart, dateEnd);
    const grouped = {};

    expenses.forEach(e => {
      const cat = e.category || 'miscellaneous';
      if (!grouped[cat]) {
        grouped[cat] = { total: 0, count: 0, category: cat };
      }
      grouped[cat].total += e.amount;
      grouped[cat].count++;
    });

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }

  /**
   * Get totals grouped by tax line for a date range
   */
  async function getTotalsByTaxLine(dateStart, dateEnd) {
    const { expenses } = await getStats(dateStart, dateEnd);
    const grouped = {};

    expenses.forEach(e => {
      const line = e.tax_line || 'unmapped';
      if (!grouped[line]) {
        grouped[line] = { total: 0, count: 0, taxLine: line };
      }
      grouped[line].total += e.amount;
      grouped[line].count++;
    });

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }

  /**
   * Get monthly totals for a given year
   */
  async function getMonthlyTotals(year) {
    const dateStart = `${year}-01-01`;
    const dateEnd = `${year}-12-31`;
    const { expenses } = await getStats(dateStart, dateEnd);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: new Date(year, i).toLocaleString('en-US', { month: 'short' }),
      total: 0,
      count: 0
    }));

    expenses.forEach(e => {
      const m = new Date(e.date + 'T00:00:00').getMonth();
      months[m].total += e.amount;
      months[m].count++;
    });

    return months;
  }

  /**
   * Get totals grouped by vendor for a date range
   */
  async function getTotalsByVendor(dateStart, dateEnd) {
    const { expenses } = await getStats(dateStart, dateEnd);
    const grouped = {};

    expenses.forEach(e => {
      const vendor = (e.vendor || 'Unknown').trim();
      if (!grouped[vendor]) {
        grouped[vendor] = { total: 0, count: 0, vendor };
      }
      grouped[vendor].total += e.amount;
      grouped[vendor].count++;
    });

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }

  /**
   * Get expenses with no tax line assigned
   */
  async function getUnmappedExpenses(dateStart, dateEnd) {
    const { expenses } = await getStats(dateStart, dateEnd);
    return expenses.filter(e => !e.tax_line || e.tax_line === '' || e.tax_line === 'unmapped');
  }

  /**
   * Get Schedule F report data for a tax year
   */
  async function getScheduleFReport(year) {
    const dateStart = `${year}-01-01`;
    const dateEnd = `${year}-12-31`;
    const taxTotals = await getTotalsByTaxLine(dateStart, dateEnd);
    const unmapped = await getUnmappedExpenses(dateStart, dateEnd);

    // Map to official tax lines
    const report = CONFIG.taxLines.map(tl => {
      const match = taxTotals.find(t => t.taxLine === tl.id);
      return {
        line: tl.line,
        id: tl.id,
        label: tl.label,
        total: match ? match.total : 0,
        count: match ? match.count : 0
      };
    });

    const grandTotal = report.reduce((sum, r) => sum + r.total, 0);

    return {
      year,
      lines: report,
      grandTotal,
      unmapped,
      unmappedTotal: unmapped.reduce((sum, e) => sum + e.amount, 0)
    };
  }

  // ═══════════════════════════════════════════════
  //  VENDOR HISTORY — for autocomplete
  // ═══════════════════════════════════════════════

  async function getDistinctVendors() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('vendor')
          .not('vendor', 'is', null);

        if (!error && data) {
          const unique = [...new Set(data.map(d => d.vendor).filter(Boolean))];
          return unique.sort();
        }
      } catch (e) { /* fall through */ }
    }

    const expenses = localGetAll(LOCAL_KEYS.expenses);
    const unique = [...new Set(expenses.map(e => e.vendor).filter(Boolean))];
    return unique.sort();
  }

  // ═══════════════════════════════════════════════
  //  RECEIPT IMAGE STORAGE
  // ═══════════════════════════════════════════════

  /**
   * Upload a receipt image to Supabase Storage
   * Falls back to storing base64 in localStorage
   */
  async function uploadReceipt(file, expenseId) {
    const fileName = `receipts/${expenseId}_${Date.now()}.${file.name.split('.').pop()}`;

    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('receipts')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        return {
          path: fileName,
          url: urlData?.publicUrl || null,
          storage: 'supabase'
        };
      } catch (e) {
        console.warn('DB: Supabase storage upload failed — storing locally', e);
      }
    }

    // Fallback: store as base64 in localStorage
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          path: fileName,
          url: reader.result,   // base64 data URL
          storage: 'local'
        });
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Delete a receipt from storage
   */
  async function deleteReceipt(path) {
    if (supabase && path) {
      try {
        await supabase.storage.from('receipts').remove([path]);
      } catch (e) {
        console.warn('DB: Receipt delete failed', e);
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  SETTINGS
  // ═══════════════════════════════════════════════

  async function getSettings() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();
        if (!error && data) {
          localSet(LOCAL_KEYS.settings, data);
          return data;
        }
      } catch (e) { /* fall through */ }
    }
    return localGet(LOCAL_KEYS.settings) || {
      farm_name: CONFIG.appName,
      fiscal_year_start: CONFIG.fiscalYearStartMonth,
      default_payment: CONFIG.defaultPaymentMethod,
      ein: ''
    };
  }

  async function saveSettings(settings) {
    localSet(LOCAL_KEYS.settings, settings);

    if (supabase) {
      try {
        const { error } = await supabase
          .from('settings')
          .upsert({ id: 'main', ...settings });
        if (error) throw error;
      } catch (e) {
        console.warn('DB: Settings save to Supabase failed', e);
        queueSync('update', 'settings', { id: 'main', ...settings });
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  CUSTOM CATEGORIES (user-added)
  // ═══════════════════════════════════════════════

  async function getCustomCategories() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('custom_categories')
          .select('*')
          .order('name');
        if (!error && data) {
          localSet(LOCAL_KEYS.categories, data);
          return data;
        }
      } catch (e) { /* fall through */ }
    }
    return localGetAll(LOCAL_KEYS.categories);
  }

  async function saveCustomCategory(category) {
    const record = {
      id: category.id || generateId(),
      ...category,
      created_at: new Date().toISOString()
    };

    const cats = localGetAll(LOCAL_KEYS.categories);
    const existingIdx = cats.findIndex(c => c.id === record.id);
    if (existingIdx !== -1) {
      cats[existingIdx] = record;
    } else {
      cats.push(record);
    }
    localSet(LOCAL_KEYS.categories, cats);

    if (supabase) {
      try {
        await supabase.from('custom_categories').upsert(record);
      } catch (e) {
        queueSync('insert', 'custom_categories', record);
      }
    }
    return record;
  }

  async function deleteCustomCategory(id) {
    let cats = localGetAll(LOCAL_KEYS.categories);
    cats = cats.filter(c => c.id !== id);
    localSet(LOCAL_KEYS.categories, cats);

    if (supabase) {
      try {
        await supabase.from('custom_categories').delete().eq('id', id);
      } catch (e) {
        queueSync('delete', 'custom_categories', { id });
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  REAL-TIME SUBSCRIPTIONS
  //  Multi-user live sync
  // ═══════════════════════════════════════════════

  let subscriptions = [];

  function subscribeToExpenses(callback) {
    if (!supabase) return null;

    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => {
          console.log('DB: Real-time event', payload.eventType);

          // Update local cache
          const expenses = localGetAll(LOCAL_KEYS.expenses);

          switch (payload.eventType) {
            case 'INSERT':
              if (!expenses.find(e => e.id === payload.new.id)) {
                expenses.push(payload.new);
                localSet(LOCAL_KEYS.expenses, expenses);
              }
              break;

            case 'UPDATE': {
              const idx = expenses.findIndex(e => e.id === payload.new.id);
              if (idx !== -1) {
                expenses[idx] = payload.new;
                localSet(LOCAL_KEYS.expenses, expenses);
              }
              break;
            }

            case 'DELETE': {
              const filtered = expenses.filter(e => e.id !== payload.old.id);
              localSet(LOCAL_KEYS.expenses, filtered);
              break;
            }
          }

          // Notify the app
          if (callback) callback(payload);
        }
      )
      .subscribe();

    subscriptions.push(channel);
    return channel;
  }

  function unsubscribeAll() {
    subscriptions.forEach(ch => {
      if (supabase) supabase.removeChannel(ch);
    });
    subscriptions = [];
  }

  // ═══════════════════════════════════════════════
  //  ONLINE / OFFLINE DETECTION
  // ═══════════════════════════════════════════════

  let syncStatusCallback = null;

  function onSyncStatusChange(callback) {
    syncStatusCallback = callback;
  }

  function initConnectivityListeners() {
    window.addEventListener('online', async () => {
      console.log('DB: Back online — flushing sync queue');
      if (syncStatusCallback) syncStatusCallback('syncing');

      const result = await flushSyncQueue();
      console.log('DB: Sync result', result);

      if (syncStatusCallback) {
        syncStatusCallback(result.failed > 0 ? 'partial' : 'synced');
      }
    });

    window.addEventListener('offline', () => {
      console.log('DB: Went offline');
      if (syncStatusCallback) syncStatusCallback('offline');
    });
  }

  function isOnline() {
    return navigator.onLine;
  }

  function isSupabaseConnected() {
    return supabase !== null;
  }

  // ═══════════════════════════════════════════════
  //  DATA MERGE UTILITY
  //  Merges remote and local data by ID, preferring
  //  the record with the latest updated_at
  // ═══════════════════════════════════════════════
  function mergeData(local, remote) {
    const map = new Map();

    local.forEach(item => map.set(item.id, item));

    remote.forEach(item => {
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        // Keep whichever was updated more recently
        const existingTime = new Date(existing.updated_at || 0).getTime();
        const remoteTime = new Date(item.updated_at || 0).getTime();
        if (remoteTime >= existingTime) {
          map.set(item.id, item);
        }
      }
    });

    return Array.from(map.values());
  }

  // ═══════════════════════════════════════════════
  //  DATA EXPORT UTILITIES
  // ═══════════════════════════════════════════════

  /**
   * Export all expenses for a date range as a flat array
   * (used by reports.js for Excel export)
   */
  async function exportExpenses(dateStart, dateEnd) {
    const { expenses } = await getStats(dateStart, dateEnd);

    return expenses.map(e => {
      const cat = CONFIG.getCategory(e.category);
      const taxLine = CONFIG.getTaxLine(e.tax_line);
      return {
        date: e.date,
        vendor: e.vendor || '',
        amount: e.amount,
        category: cat ? cat.name : (e.category || ''),
        subcategory: e.subcategory || '',
        tax_line_number: taxLine ? taxLine.line : '',
        tax_line_description: taxLine ? taxLine.label : '',
        payment_method: e.payment_method || '',
        check_number: e.check_number || '',
        description: e.description || '',
        tags: e.tags || '',
        created_by: e.user_name || ''
      };
    });
  }

  /**
   * Export full dataset for backup
   */
  async function exportFullBackup() {
    const expenses = localGetAll(LOCAL_KEYS.expenses);
    const categories = localGetAll(LOCAL_KEYS.categories);
    const settings = localGet(LOCAL_KEYS.settings);

    return {
      version: CONFIG.version,
      exported_at: new Date().toISOString(),
      farm_name: CONFIG.appName,
      expenses,
      custom_categories: categories,
      settings
    };
  }

  /**
   * Import from backup
   */
  async function importBackup(backup) {
    if (backup.expenses) {
      const existing = localGetAll(LOCAL_KEYS.expenses);
      const merged = mergeData(existing, backup.expenses);
      localSet(LOCAL_KEYS.expenses, merged);

      // Queue all for sync
      backup.expenses.forEach(e => queueSync('insert', 'expenses', e));
    }

    if (backup.custom_categories) {
      localSet(LOCAL_KEYS.categories, backup.custom_categories);
    }

    if (backup.settings) {
      localSet(LOCAL_KEYS.settings, backup.settings);
    }

    // Try to flush to cloud
    if (supabase && navigator.onLine) {
      await flushSyncQueue();
    }

    return true;
  }

  // ═══════════════════════════════════════════════
  //  INITIALIZE
  // ═══════════════════════════════════════════════

  async function initialize() {
    init();
    initConnectivityListeners();

    // Flush any pending sync operations
    if (supabase && navigator.onLine) {
      const result = await flushSyncQueue();
      if (result.synced > 0) {
        console.log(`DB: Synced ${result.synced} pending operations`);
      }
    }

    return {
      mode: supabase ? 'cloud' : 'local',
      online: navigator.onLine,
      pendingSync: localGetAll(LOCAL_KEYS.syncQueue).length
    };
  }

  // ═══════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════════
    return {
    initialize,
    isOnline,
    isSupabaseConnected,
    getExpenses,
    getExpense,
    createExpense,
    updateExpense,
    deleteExpenses,
    getStats,
    getTotalsByCategory,
    getTotalsByTaxLine,
    getMonthlyTotals,
    getTotalsByVendor,
    getUnmappedExpenses,
    getScheduleFReport,
    getDistinctVendors,
    uploadReceipt,
    deleteReceipt,
    getSettings,
    saveSettings,
    getCustomCategories,
    saveCustomCategory,
    deleteCustomCategory,
    subscribeToExpenses,
    unsubscribeAll,
    flushSyncQueue,

    onSyncStatusChange,
    exportExpenses,
    exportFullBackup,
    importBackup,
    generateId,
    addTestData
  };

// Utility: Generate a random unique ID (UUID v4-like)
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
  // Move flushSyncQueue function definition here
  /**
   * Flush the local sync queue to Supabase (if connected)
   * Retries all pending operations in the sync queue
   */
  async function flushSyncQueue() {
    if (!supabase) {
      // Nothing to do in local-only mode
      return { synced: 0, failed: 0 };
    }
    let queue = localGetAll(LOCAL_KEYS.syncQueue);
    let synced = 0;
    let failed = 0;
    const newQueue = [];
    for (const op of queue) {
      try {
        if (op.table === 'expenses') {
          if (op.type === 'insert') {
            await supabase.from('expenses').insert(op.data);
          } else if (op.type === 'update') {
            await supabase.from('expenses').update(op.data).eq('id', op.data.id);
          } else if (op.type === 'delete') {
            await supabase.from('expenses').delete().eq('id', op.data.id);
          }
        } else if (op.table === 'custom_categories') {
          if (op.type === 'insert') {
            await supabase.from('custom_categories').upsert(op.data);
          } else if (op.type === 'delete') {
            await supabase.from('custom_categories').delete().eq('id', op.data.id);
          }
        }
        synced++;
      } catch (e) {
        failed++;
        newQueue.push(op);
      }
    }
    localSet(LOCAL_KEYS.syncQueue, newQueue);
    return { synced, failed };
  }
})();

