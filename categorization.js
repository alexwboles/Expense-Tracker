/* ═══════════════════════════════════════════════
   CATEGORIZATION.JS — Auto-Categorization Engine
   Boles West Run Ranch — Expense Tracker

   Three-tier matching:
   1. Vendor keyword lookup (highest confidence)
   2. Description keyword scan
   3. Historical pattern matching (learns from past entries)
   ═══════════════════════════════════════════════ */

const CATEGORIZE = (() => {

  // ─── LEARNING CACHE ───
  // Stores vendor → category mappings from user-confirmed entries
  const HISTORY_KEY = 'bwrr_cat_history';

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    } catch { return {}; }
  }

  function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  // ═══════════════════════════════════════════════
  //  MAIN SUGGESTION ENGINE
  // ═══════════════════════════════════════════════

  /**
   * Suggest a category for an expense based on vendor and description.
   *
   * @param {string} vendor - Vendor / payee name
   * @param {string} description - Optional description or notes
   * @param {number} amount - Optional amount (for amount-based heuristics)
   * @returns {Object|null} {
   *   categoryId, categoryName, subcategory,
   *   taxLine, taxLineLabel, taxLineNumber,
   *   confidence, method
   * }
   */
  function suggestCategory(vendor = '', description = '', amount = 0) {
    const vendorLower = (vendor || '').toLowerCase().trim();
    const descLower = (description || '').toLowerCase().trim();
    const combined = `${vendorLower} ${descLower}`;

    let result = null;

    // ─── TIER 1: Vendor keyword match (highest confidence) ───
    result = matchVendorKeywords(vendorLower);
    if (result) {
      result.method = 'vendor_keyword';
      result.confidence = 95;
      return enrichResult(result);
    }

    // ─── TIER 2: Historical pattern match ───
    result = matchHistory(vendorLower);
    if (result) {
      result.method = 'history';
      result.confidence = 85;
      return enrichResult(result);
    }

    // ─── TIER 3: Description keyword match ───
    result = matchDescriptionKeywords(descLower);
    if (result) {
      result.method = 'description_keyword';
      result.confidence = 75;
      return enrichResult(result);
    }

    // ─── TIER 4: Combined text scan ───
    result = matchDescriptionKeywords(combined);
    if (result) {
      result.method = 'combined_scan';
      result.confidence = 65;
      return enrichResult(result);
    }

    // ─── TIER 5: Amount-based heuristics ───
    result = matchByAmount(amount, combined);
    if (result) {
      result.method = 'amount_heuristic';
      result.confidence = 40;
      return enrichResult(result);
    }

    // No match
    return null;
  }

  // ═══════════════════════════════════════════════
  //  TIER 1: VENDOR KEYWORD MATCHING
  // ═══════════════════════════════════════════════

  function matchVendorKeywords(vendorLower) {
    const keywords = CONFIG.vendorKeywords;

    // Exact key match first (longest match wins)
    const sortedKeys = Object.keys(keywords).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (vendorLower.includes(key.toLowerCase())) {
        const mapping = keywords[key];
        return {
          categoryId: mapping.category,
          subcategory: mapping.subHint || ''
        };
      }
    }

    return null;
  }

  // ═══════════════════════════════════════════════
  //  TIER 2: HISTORICAL PATTERN MATCHING
  //  Learns from user-confirmed categorizations
  // ═══════════════════════════════════════════════

  function matchHistory(vendorLower) {
    if (!vendorLower || vendorLower.length < 3) return null;

    const history = getHistory();

    // Exact vendor match
    if (history[vendorLower]) {
      return {
        categoryId: history[vendorLower].category,
        subcategory: history[vendorLower].subcategory || ''
      };
    }

    // Fuzzy match: check if any history key is contained in vendor or vice versa
    for (const [key, mapping] of Object.entries(history)) {
      if (key.length >= 4 && (vendorLower.includes(key) || key.includes(vendorLower))) {
        return {
          categoryId: mapping.category,
          subcategory: mapping.subcategory || ''
        };
      }
    }

    return null;
  }

  // ═══════════════════════════════════════════════
  //  TIER 3: DESCRIPTION KEYWORD MATCHING
  // ═══════════════════════════════════════════════

  function matchDescriptionKeywords(textLower) {
    if (!textLower || textLower.length < 3) return null;

    const keywords = CONFIG.descriptionKeywords;

    // Sort by key length descending (prefer longer, more specific matches)
    const sortedKeys = Object.keys(keywords).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      // Word boundary check to avoid partial matches
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escaped}`, 'i');

      if (pattern.test(textLower)) {
        return {
          categoryId: keywords[key],
          subcategory: ''
        };
      }
    }

    return null;
  }

  // ═══════════════════════════════════════════════
  //  TIER 5: AMOUNT-BASED HEURISTICS
  //  Low-confidence guesses based on common ranges
  // ═══════════════════════════════════════════════

  function matchByAmount(amount, textHints = '') {
    if (!amount || amount <= 0) return null;

    // Very large purchases (> $5000) are often equipment or livestock
    if (amount > 5000) {
      if (textHints.includes('head') || textHints.includes('cattle') || textHints.includes('bull')) {
        return { categoryId: 'livestock_purchase', subcategory: '' };
      }
      return { categoryId: 'equipment_purchase', subcategory: '' };
    }

    // Typical ranges (very low confidence, only used as last resort)
    // These are NOT returned by default — only when combined with some textual hint
    return null;
  }

  // ═══════════════════════════════════════════════
  //  RESULT ENRICHMENT
  //  Add category name, tax line info, etc.
  // ═══════════════════════════════════════════════

  function enrichResult(result) {
    if (!result || !result.categoryId) return result;

    const category = CONFIG.getCategory(result.categoryId);
    if (category) {
      result.categoryName = category.name;
      result.icon = category.icon;
      result.color = category.color;

      // Get default tax line mapping
      const taxLine = CONFIG.getTaxLine(category.defaultTaxLine);
      if (taxLine) {
        result.taxLine = taxLine.id;
        result.taxLineLabel = taxLine.label;
        result.taxLineNumber = taxLine.line;
      }

      // Validate subcategory
      if (result.subcategory && !category.subcategories.includes(result.subcategory)) {
        result.subcategory = '';
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════
  //  LEARNING — Record user-confirmed categories
  // ═══════════════════════════════════════════════

  /**
   * Record a confirmed vendor → category mapping.
   * Called when user saves an expense (confirmed categorization).
   *
   * @param {string} vendor - Vendor name
   * @param {string} categoryId - Confirmed category
   * @param {string} subcategory - Confirmed subcategory
   */
  function learn(vendor, categoryId, subcategory = '', suggestion = null) {
    if (!vendor || !categoryId) return;

    const vendorKey = vendor.toLowerCase().trim();
    if (vendorKey.length < 3) return;

    const history = getHistory();

    // Track corrections if suggestion was present and different
    if (suggestion && suggestion.categoryId && suggestion.categoryId !== categoryId) {
      let corrections = JSON.parse(localStorage.getItem('bwrr_cat_corrections') || '[]');
      corrections.push({
        vendor: vendor,
        suggested: suggestion.categoryId,
        chosen: categoryId,
        subcategory,
        timestamp: new Date().toISOString()
      });
      // Keep only last 500 corrections
      if (corrections.length > 500) corrections = corrections.slice(-500);
      localStorage.setItem('bwrr_cat_corrections', JSON.stringify(corrections));
    }

    history[vendorKey] = {
      category: categoryId,
      subcategory: subcategory,
      lastUsed: new Date().toISOString(),
      count: (history[vendorKey]?.count || 0) + 1
    };

    // Prune old entries (keep top 500 by count/recency)
    const entries = Object.entries(history);
    if (entries.length > 500) {
      entries.sort((a, b) => {
        if (b[1].count !== a[1].count) return b[1].count - a[1].count;
        return (b[1].lastUsed || '').localeCompare(a[1].lastUsed || '');
      });
      const pruned = Object.fromEntries(entries.slice(0, 500));
      saveHistory(pruned);
    } else {
      saveHistory(history);
    }
  }

  /**
   * Forget a specific vendor mapping
   */
  function forget(vendor) {
    if (!vendor) return;
    const history = getHistory();
    delete history[vendor.toLowerCase().trim()];
    saveHistory(history);
  }

  /**
   * Clear all learned patterns
   */
  function clearHistory() {
    saveHistory({});
  }

  /**
   * Get learning statistics
   */
  function getStats() {
    const history = getHistory();
    const entries = Object.entries(history);

    return {
      totalVendors: entries.length,
      totalConfirmations: entries.reduce((sum, [, v]) => sum + (v.count || 1), 0),
      topVendors: entries
        .sort((a, b) => (b[1].count || 1) - (a[1].count || 1))
        .slice(0, 20)
        .map(([vendor, data]) => ({
          vendor,
          category: data.category,
          count: data.count || 1
        }))
    };
  }

  // ═══════════════════════════════════════════════
  //  BATCH CATEGORIZATION
  //  Categorize multiple expenses at once
  // ═══════════════════════════════════════════════

  /**
   * Suggest categories for an array of expenses
   * @param {Array} expenses - Array of { vendor, description, amount }
   * @returns {Array} Same array with `suggestion` property added
   */
  function batchCategorize(expenses) {
    return expenses.map(expense => {
      const suggestion = suggestCategory(
        expense.vendor,
        expense.description,
        expense.amount
      );
      return {
        ...expense,
        suggestion
      };
    });
  }

  // ═══════════════════════════════════════════════
  //  TAX LINE AUTO-MAPPING
  //  Determine the IRS Schedule F line for a category
  // ═══════════════════════════════════════════════

  /**
   * Get the tax line for a given category + subcategory.
   * Some subcategories override the default mapping.
   */
  function getTaxLineForExpense(categoryId, subcategory = '', vendor = '') {
    const category = CONFIG.getCategory(categoryId);
    if (!category) return null;

    // Special overrides based on subcategory
    const overrides = {
      // Rent category splits
      'Equipment Rental':           'rent_vehicles',
      'Storage Unit Rental':        'storage',
      'Pasture Lease':              'rent_land',
      'Farmland Rent':              'rent_land',
      'Livestock Lease':            'rent_land',

      // Interest category splits
      'Mortgage Interest — Farm Property': 'mortgage_interest',
      'Operating Loan Interest':    'other_interest',
      'Equipment Loan Interest':    'other_interest',
      'Line of Credit Interest':    'other_interest',

      // Pasture & land splits
      'Fencing — New':              'repairs',
      'Fencing — Repair':           'repairs',
      'Fence Posts / Wire / Supplies': 'supplies',
      'Pasture Seeding':            'seeds_plants',
      'Lime Application':           'fertilizer_lime',
      'Water System — Troughs':     'supplies',
      'Water System — Ponds':       'conservation',
      'Water System — Wells / Pumps': 'repairs',
      'Mowing / Bush Hogging':      'custom_hire',

      // Vehicle splits
      'Truck Fuel':                 'gas_fuel_oil',
      'Truck Insurance':            'insurance',
      'Registration / Tags':        'taxes',

      // Labor splits
      'Payroll Taxes / Withholding': 'taxes',

      // Building splits
      'Barn Construction / New':    'depreciation',
      'Electrical — Buildings':     'repairs',
      'Plumbing — Buildings':       'repairs',

      // Supply splits
      'Office Supplies — Farm':     'other_expense'
    };

    if (subcategory && overrides[subcategory]) {
      return CONFIG.getTaxLine(overrides[subcategory]);
    }

    // Default mapping from category
    return CONFIG.getTaxLine(category.defaultTaxLine);
  }

  // ═══════════════════════════════════════════════
  //  SUBCATEGORY SUGGESTIONS
  //  Refine subcategory based on description keywords
  // ═══════════════════════════════════════════════

  function suggestSubcategory(categoryId, description = '') {
    const category = CONFIG.getCategory(categoryId);
    if (!category || !category.subcategories.length) return '';

    const descLower = description.toLowerCase();

    // Score each subcategory by keyword overlap
    let bestMatch = '';
    let bestScore = 0;

    for (const sub of category.subcategories) {
      const subWords = sub.toLowerCase().split(/[\s\/\-—]+/).filter(w => w.length > 2);
      let score = 0;

      for (const word of subWords) {
        if (descLower.includes(word)) {
          score += word.length; // Longer word matches score higher
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = sub;
      }
    }

    return bestScore >= 3 ? bestMatch : '';
  }

  // ═══════════════════════════════════════════════
  //  VALIDATION & REVIEW HELPERS
  // ═══════════════════════════════════════════════

  /**
   * Check if an expense has a valid category + tax line mapping
   */
  function validateMapping(expense) {
    const issues = [];

    if (!expense.category) {
      issues.push('No operational category assigned.');
    } else {
      const cat = CONFIG.getCategory(expense.category);
      if (!cat) issues.push(`Unknown category: ${expense.category}`);
    }

    if (!expense.tax_line) {
      issues.push('No IRS tax line assigned — will appear in Unmapped on Tax Report.');
    } else {
      const tl = CONFIG.getTaxLine(expense.tax_line);
      if (!tl) issues.push(`Unknown tax line: ${expense.tax_line}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get all expenses that need category review
   * (low confidence or no category)
   */
  async function getExpensesNeedingReview() {
    const { data } = await DB.getExpenses(
      {},
      { page: 1, pageSize: 100000, sortBy: 'date', sortDir: 'desc' }
    );

    return data.filter(e => {
      if (!e.category) return true;
      if (!e.tax_line) return true;
      return false;
    });
  }

  /**
   * Auto-categorize all uncategorized expenses
   * Returns array of { expense, suggestion }
   */
  async function autoFillUncategorized() {
    const needsReview = await getExpensesNeedingReview();
    const results = [];

    for (const expense of needsReview) {
      const suggestion = suggestCategory(
        expense.vendor,
        expense.description,
        expense.amount
      );

      if (suggestion && suggestion.confidence >= 65) {
        results.push({
          expense,
          suggestion,
          autoFilled: true
        });
      } else {
        results.push({
          expense,
          suggestion,
          autoFilled: false
        });
      }
    }

    return results;
  }

  /**
   * Apply auto-categorization to an expense (saves to DB)
   */
  async function applyCategory(expenseId, categoryId, subcategory, taxLineId) {
    const updates = {
      category: categoryId,
      subcategory: subcategory || '',
      tax_line: taxLineId || ''
    };

    // If no tax line provided, auto-detect
    if (!taxLineId) {
      const taxLine = getTaxLineForExpense(categoryId, subcategory);
      if (taxLine) updates.tax_line = taxLine.id;
    }

    return await DB.updateExpense(expenseId, updates);
  }

  // ═══════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════
  return {
    // Core
    suggestCategory,
    batchCategorize,
    getTaxLineForExpense,
    suggestSubcategory,

    // Learning
    learn,
    forget,
    clearHistory,
    getStats,

    // Validation
    validateMapping,
    getExpensesNeedingReview,
    autoFillUncategorized,
    applyCategory
  };

})();
