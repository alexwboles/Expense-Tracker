/* ═══════════════════════════════════════════════
   OCR.JS — Receipt Scanning & Data Extraction
   Boles West Run Ranch — Expense Tracker
   
   Uses Tesseract.js for client-side OCR.
   Extracts: vendor, date, total, line items.
   Feeds results into the auto-categorization engine.
   ═══════════════════════════════════════════════ */

const OCR = (() => {

  // ─── STATE ───
  let worker = null;
  let isProcessing = false;
  let lastResult = null;

  // ═══════════════════════════════════════════════
  //  TESSERACT WORKER LIFECYCLE
  // ═══════════════════════════════════════════════

  /**
   * Initialize or reuse the Tesseract worker
   */
  async function getWorker(onProgress) {
    if (worker) return worker;

    worker = await Tesseract.createWorker('eng', 1, {
      logger: (info) => {
        if (onProgress && info.status) {
          const pct = Math.round((info.progress || 0) * 100);
          onProgress(info.status, pct);
        }
      }
    });

    return worker;
  }

  /**
   * Terminate the worker to free memory
   */
  async function terminateWorker() {
    if (worker) {
      await worker.terminate();
      worker = null;
    }
  }

  // ═══════════════════════════════════════════════
  //  MAIN OCR PIPELINE
  // ═══════════════════════════════════════════════

  /**
   * Process a receipt image and extract structured data
   * @param {File|Blob|string} imageSource - File, Blob, data URL, or image URL
   * @param {Function} onProgress - Progress callback(status, percent)
   * @returns {Object} Extracted receipt data
   */
  async function processReceipt(imageSource, onProgress) {
    if (isProcessing) {
      return { error: 'OCR is already processing a receipt.' };
    }

    isProcessing = true;

    try {
      // Step 1: Initialize worker
      if (onProgress) onProgress('Initializing OCR engine...', 5);
      const w = await getWorker(onProgress);

      // Step 2: Preprocess image if needed
      if (onProgress) onProgress('Preparing image...', 10);
      const processedImage = await preprocessImage(imageSource);

      // Step 3: Run OCR
      if (onProgress) onProgress('Scanning receipt text...', 20);
      const { data } = await w.recognize(processedImage);

      if (onProgress) onProgress('Extracting data...', 85);

      // Step 4: Parse the raw text
      const rawText = data.text || '';
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      const confidence = data.confidence || 0;

      // Step 5: Extract structured fields
      const vendor = extractVendor(lines);
      const date = extractDate(lines, rawText);
      const totals = extractTotals(lines);
      const lineItems = extractLineItems(lines);
      const paymentMethod = extractPaymentMethod(rawText);

      // Step 6: Auto-categorize based on vendor
      let suggestedCategory = null;
      if (vendor && typeof CATEGORIZE !== 'undefined') {
        const suggestion = CATEGORIZE.suggestCategory(vendor, rawText);
        suggestedCategory = suggestion;
      }

      if (onProgress) onProgress('Complete!', 100);

      lastResult = {
        success: true,
        confidence: Math.round(confidence),
        rawText,
        lines,
        vendor,
        date,
        total: totals.total,
        subtotal: totals.subtotal,
        tax: totals.tax,
        lineItems,
        paymentMethod,
        suggestedCategory,
        processedAt: new Date().toISOString()
      };

      return lastResult;

    } catch (e) {
      console.error('OCR: Processing failed', e);
      return {
        success: false,
        error: e.message || 'OCR processing failed.',
        rawText: ''
      };
    } finally {
      isProcessing = false;
    }
  }

  // ═══════════════════════════════════════════════
  //  IMAGE PREPROCESSING
  //  Improves OCR accuracy for receipt photos
  // ═══════════════════════════════════════════════

  async function preprocessImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Scale up small images for better OCR
          let width = img.naturalWidth;
          let height = img.naturalHeight;
          const minDimension = 1500;

          if (width < minDimension && height < minDimension) {
            const scale = minDimension / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          // Cap max size to prevent memory issues
          const maxDimension = 4000;
          if (width > maxDimension || height > maxDimension) {
            const scale = maxDimension / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;

          // Draw original
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to grayscale and increase contrast
          const imageData = ctx.getImageData(0, 0, width, height);
          const pixels = imageData.data;

          for (let i = 0; i < pixels.length; i += 4) {
            // Grayscale using luminance formula
            const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];

            // Increase contrast
            let adjusted = ((gray - 128) * 1.5) + 128;
            adjusted = Math.max(0, Math.min(255, adjusted));

            // Apply threshold for cleaner text
            const final = adjusted > 140 ? 255 : adjusted < 80 ? 0 : adjusted;

            pixels[i] = final;
            pixels[i + 1] = final;
            pixels[i + 2] = final;
          }

          ctx.putImageData(imageData, 0, 0);

          // Return as blob for Tesseract
          canvas.toBlob((blob) => {
            resolve(blob || canvas.toDataURL());
          }, 'image/png');

        } catch (e) {
          // If preprocessing fails, return original
          resolve(source);
        }
      };

      img.onerror = () => {
        // If image load fails, pass through original source
        resolve(source);
      };

      // Handle different source types
      if (source instanceof File || source instanceof Blob) {
        img.src = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        img.src = source;
      } else {
        resolve(source);
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  VENDOR EXTRACTION
  // ═══════════════════════════════════════════════

  function extractVendor(lines) {
    if (lines.length === 0) return '';

    // Known vendor patterns (often the first meaningful line)
    const skipPatterns = [
      /^[\d\s\-\(\)]+$/,           // Phone numbers
      /^\d{1,2}[\/\-]\d{1,2}/,     // Dates
      /^(welcome|thank|receipt)/i,  // Greetings
      /^(store|loc|register)/i,     // Store metadata
      /^\*+$/,                      // Decorative lines
      /^={3,}$/,                    // Separators
      /^-{3,}$/                     // Separators
    ];

    // Try the first 5 non-trivial lines
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();

      // Skip empty or too-short lines
      if (line.length < 3) continue;

      // Skip lines matching skip patterns
      if (skipPatterns.some(p => p.test(line))) continue;

      // Skip lines that look like addresses (contain state abbreviations + zip)
      if (/\b[A-Z]{2}\s+\d{5}\b/.test(line)) continue;

      // Good candidate: has letters, reasonable length
      if (/[a-zA-Z]{2,}/.test(line) && line.length <= 60) {
        // Clean up common OCR artifacts
        let vendor = line
          .replace(/[#*=_]/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        // Title case if all caps
        if (vendor === vendor.toUpperCase() && vendor.length > 2) {
          vendor = vendor.replace(/\b\w+/g, w =>
            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          );
        }

        return vendor;
      }
    }

    // Fallback: return first line with letters
    const fallback = lines.find(l => /[a-zA-Z]{2,}/.test(l));
    return fallback ? fallback.trim().slice(0, 50) : '';
  }

  // ═══════════════════════════════════════════════
  //  DATE EXTRACTION
  // ═══════════════════════════════════════════════

  function extractDate(lines, rawText) {
    const datePatterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2}|\d{2})/,
      // YYYY-MM-DD (ISO)
      /(20\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
      // Month DD, YYYY
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s*(20\d{2})/i,
      // DD Month YYYY
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(20\d{2})/i
    ];

    const monthMap = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    // Search each line for a date
    const allText = lines.join(' ') + ' ' + rawText;

    for (const pattern of datePatterns) {
      const match = allText.match(pattern);
      if (!match) continue;

      try {
        let year, month, day;

        if (pattern === datePatterns[0]) {
          // MM/DD/YYYY
          month = match[1].padStart(2, '0');
          day = match[2].padStart(2, '0');
          year = match[3].length === 2 ? '20' + match[3] : match[3];
        } else if (pattern === datePatterns[1]) {
          // YYYY-MM-DD
          year = match[1];
          month = match[2].padStart(2, '0');
          day = match[3].padStart(2, '0');
        } else if (pattern === datePatterns[2]) {
          // Month DD, YYYY
          month = monthMap[match[1].slice(0, 3).toLowerCase()];
          day = match[2].padStart(2, '0');
          year = match[3];
        } else if (pattern === datePatterns[3]) {
          // DD Month YYYY
          day = match[1].padStart(2, '0');
          month = monthMap[match[2].slice(0, 3).toLowerCase()];
          year = match[3];
        }

        // Validate
        const dateObj = new Date(`${year}-${month}-${day}T00:00:00`);
        if (!isNaN(dateObj.getTime())) {
          return `${year}-${month}-${day}`;
        }
      } catch (e) { continue; }
    }

    // Fallback: today's date
    return new Date().toISOString().slice(0, 10);
  }

  // ═══════════════════════════════════════════════
  //  TOTAL / SUBTOTAL / TAX EXTRACTION
  // ═══════════════════════════════════════════════

  function extractTotals(lines) {
    const result = {
      total: 0,
      subtotal: 0,
      tax: 0
    };

    // Patterns for monetary amounts
    const moneyPattern = /\$?\s*(\d{1,6}[,.]?\d{0,3}\.?\d{2})\b/;

    // Keywords ranked by priority (most specific first)
    const totalKeywords = [
      /\btotal\s*(due|amt|amount|sale)?\b/i,
      /\bgrand\s*total\b/i,
      /\bamount\s*(due|owed)\b/i,
      /\bbalance\s*(due)?\b/i,
      /\btotal\b/i
    ];

    const subtotalKeywords = [
      /\bsub\s*total\b/i,
      /\bsubtotal\b/i,
      /\bmerch\s*total\b/i,
      /\bitem\s*total\b/i
    ];

    const taxKeywords = [
      /\b(sales?\s*)?tax\b/i,
      /\btx\b/i,
      /\bhst\b/i,
      /\bgst\b/i
    ];

    // Extract amounts associated with keywords
    for (const line of lines) {
      const money = line.match(moneyPattern);
      if (!money) continue;

      const amount = parseFloat(money[1].replace(',', ''));
      if (isNaN(amount) || amount <= 0) continue;

      // Check for total
      if (!result.total && totalKeywords.some(p => p.test(line))) {
        result.total = amount;
        continue;
      }

      // Check for subtotal
      if (!result.subtotal && subtotalKeywords.some(p => p.test(line))) {
        result.subtotal = amount;
        continue;
      }

      // Check for tax
      if (!result.tax && taxKeywords.some(p => p.test(line))) {
        result.tax = amount;
        continue;
      }
    }

    // If no total found, try the largest dollar amount in the last 8 lines
    if (!result.total) {
      const lastLines = lines.slice(-8);
      let maxAmount = 0;

      for (const line of lastLines) {
        const money = line.match(moneyPattern);
        if (money) {
          const amount = parseFloat(money[1].replace(',', ''));
          if (amount > maxAmount) maxAmount = amount;
        }
      }

      if (maxAmount > 0) result.total = maxAmount;
    }

    // Infer missing values
    if (result.total && result.tax && !result.subtotal) {
      result.subtotal = Math.round((result.total - result.tax) * 100) / 100;
    }
    if (result.subtotal && result.tax && !result.total) {
      result.total = Math.round((result.subtotal + result.tax) * 100) / 100;
    }

    return result;
  }

  // ═══════════════════════════════════════════════
  //  LINE ITEM EXTRACTION
  // ═══════════════════════════════════════════════

  function extractLineItems(lines) {
    const items = [];

    // Skip header/footer keywords
    const skipKeywords = [
      /total/i, /subtotal/i, /sub total/i, /tax/i, /change/i,
      /cash/i, /credit/i, /debit/i, /visa/i, /mastercard/i,
      /balance/i, /welcome/i, /thank/i, /receipt/i, /store/i,
      /phone/i, /address/i, /date/i, /time/i, /register/i,
      /cashier/i, /clerk/i, /terminal/i, /trans/i
    ];

    // Pattern: item description followed by a price
    // e.g., "FENCE POST 8FT    $12.99"
    // e.g., "Baling Twine 2pk     24.50"
    const itemPattern = /^(.+?)\s{2,}\$?\s*(\d{1,5}\.\d{2})\s*$/;

    // Pattern with quantity: "2 x MINERAL BLOCK   $15.98"
    const qtyPattern = /^(\d+)\s*[xX@]\s*(.+?)\s{2,}\$?\s*(\d{1,5}\.\d{2})\s*$/;

    // Pattern: qty then item then price
    const qtyPattern2 = /^(\d+)\s+(.+?)\s{2,}\$?\s*(\d{1,5}\.\d{2})\s*$/;

    for (const line of lines) {
      // Skip known non-item lines
      if (skipKeywords.some(p => p.test(line))) continue;
      if (line.length < 5) continue;

      // Try quantity pattern first
      let match = line.match(qtyPattern);
      if (match) {
        items.push({
          name: cleanItemName(match[2]),
          quantity: parseInt(match[1]),
          price: parseFloat(match[3])
        });
        continue;
      }

      match = line.match(qtyPattern2);
      if (match) {
        const qty = parseInt(match[1]);
        // Only treat as qty if reasonable (1-999)
        if (qty > 0 && qty < 1000) {
          items.push({
            name: cleanItemName(match[2]),
            quantity: qty,
            price: parseFloat(match[3])
          });
          continue;
        }
      }

      // Try standard item + price
      match = line.match(itemPattern);
      if (match) {
        const name = match[1].trim();
        // Skip if name is too short or looks like metadata
        if (name.length >= 3 && /[a-zA-Z]/.test(name)) {
          items.push({
            name: cleanItemName(name),
            quantity: 1,
            price: parseFloat(match[2])
          });
        }
      }
    }

    return items;
  }

  function cleanItemName(name) {
    return name
      .replace(/[#*_=]/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\d+\s+/, '')     // Leading SKU numbers
      .trim()
      .slice(0, 80);
  }

  // ═══════════════════════════════════════════════
  //  PAYMENT METHOD DETECTION
  // ═══════════════════════════════════════════════

  function extractPaymentMethod(text) {
    const lower = text.toLowerCase();

    if (/\b(visa|mastercard|mc|amex|american express|discover)\b/.test(lower)) return 'card';
    if (/\bdebit\b/.test(lower)) return 'card';
    if (/\bcredit\s*card\b/.test(lower)) return 'card';
    if (/\b(card\s*#|card\s*ending|xxxx)\b/.test(lower)) return 'card';
    if (/\bcheck\s*#?\s*\d+/.test(lower)) return 'check';
    if (/\bcash\b/.test(lower)) return 'cash';
    if (/\b(eft|ach|wire|transfer)\b/.test(lower)) return 'transfer';
    if (/\b(account|on\s*account|charge)\b/.test(lower)) return 'credit';

    return 'card'; // Default assumption
  }

  // ═══════════════════════════════════════════════
  //  RECEIPT IMAGE UTILITIES
  // ═══════════════════════════════════════════════

  /**
   * Read a file input and return a data URL for preview
   */
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate that a file is an acceptable image/PDF
   */
  function validateFile(file) {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/gif', 'image/bmp', 'image/tiff'
    ];

    if (!file) {
      return { valid: false, error: 'No file selected.' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 20MB.' };
    }

    if (file.type === 'application/pdf') {
      // Accept PDF for multi-page OCR
      return { valid: true };
    }
  /**
   * Extract images from a PDF file (returns array of image blobs)
   */
  async function extractImagesFromPDF(file) {
    // Use PDF.js to extract images from each page
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library not loaded.');
    }
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const images = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      images.push(blob);
    }
    return images;
  }

  /**
   * Process a receipt file (image or PDF)
   */
  async function processReceipt(file, onProgress) {
    if (isProcessing) {
      return { error: 'OCR is already processing a receipt.' };
    }
    isProcessing = true;
    try {
      if (file.type === 'application/pdf') {
        if (onProgress) onProgress('Extracting pages from PDF...', 5);
        const images = await extractImagesFromPDF(file);
        const results = [];
        for (let i = 0; i < images.length; i++) {
          if (onProgress) onProgress(`Scanning page ${i + 1} of ${images.length}...`, Math.round((i / images.length) * 100));
          const result = await processReceipt(images[i], onProgress);
          results.push(result);
        }
        isProcessing = false;
        return { success: true, pages: results, pageCount: images.length };
      }
      // ...existing code for image OCR...
      // Step 1: Initialize worker
      if (onProgress) onProgress('Initializing OCR engine...', 5);
      const w = await getWorker(onProgress);
      // Step 2: Preprocess image if needed
      if (onProgress) onProgress('Preparing image...', 10);
      const processedImage = await preprocessImage(file);
      // Step 3: Run OCR
      if (onProgress) onProgress('Scanning receipt text...', 20);
      const { data } = await w.recognize(processedImage);
      if (onProgress) onProgress('Extracting data...', 85);
      // ...existing code for parsing and extracting fields...
      const rawText = data.text || '';
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      const confidence = data.confidence || 0;
      const vendor = extractVendor(lines);
      const date = extractDate(lines, rawText);
      const totals = extractTotals(lines);
      const lineItems = extractLineItems(lines);
      const paymentMethod = extractPaymentMethod(rawText);
      let suggestedCategory = null;
      if (vendor && typeof CATEGORIZE !== 'undefined') {
        const suggestion = CATEGORIZE.suggestCategory(vendor, rawText);
        suggestedCategory = suggestion;
      }
      if (onProgress) onProgress('Complete!', 100);
      lastResult = {
        success: true,
        confidence: Math.round(confidence),
        rawText,
        lines,
        vendor,
        date,
        total: totals.total,
        subtotal: totals.subtotal,
        tax: totals.tax,
        lineItems,
        paymentMethod,
        suggestedCategory,
        processedAt: new Date().toISOString()
      };
      return lastResult;
    } catch (e) {
      console.error('OCR: Processing failed', e);
      return {
        success: false,
        error: e.message || 'OCR processing failed.',
        rawText: ''
      };
    } finally {
      isProcessing = false;
    }
  }
  // Receipt Gallery (for app.js integration)
  function getAllReceipts() {
    // Return all receipts with images/urls from local DB
    const expenses = JSON.parse(localStorage.getItem('bwrr_expenses') || '[]');
    return expenses.filter(e => e.receipt_url);
  }

  return {
    ...window.OCR,
    processReceipt,
    extractImagesFromPDF,
    getAllReceipts
  };

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.`
      };
    }

    return { valid: true };
  }

  /**
   * Create a compressed thumbnail for storage
   */
  function createThumbnail(file, maxWidth = 400) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.7);
      };

      img.onerror = () => resolve(null);

      if (file instanceof File || file instanceof Blob) {
        img.src = URL.createObjectURL(file);
      } else {
        img.src = file;
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  BATCH PROCESSING
  //  Process multiple receipts in sequence
  // ═══════════════════════════════════════════════

  async function processMultipleReceipts(files, onItemProgress) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (onItemProgress) {
        onItemProgress(i + 1, files.length, file.name, 'processing');
      }

      const validation = validateFile(file);
      if (!validation.valid) {
        results.push({
          file: file.name,
          success: false,
          error: validation.error
        });
        continue;
      }

      const result = await processReceipt(file, (status, pct) => {
        if (onItemProgress) {
          onItemProgress(i + 1, files.length, file.name, status, pct);
        }
      });

      results.push({
        file: file.name,
        ...result
      });

      // Small delay between receipts to prevent UI freeze
      if (i < files.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════
  //  CONFIDENCE & QUALITY ASSESSMENT
  // ═══════════════════════════════════════════════

  /**
   * Assess overall quality of OCR extraction
   * Returns: 'high', 'medium', 'low'
   */
  function assessQuality(result) {
    if (!result || !result.success) return 'low';

    let score = 0;

    // Confidence from Tesseract (0-100)
    if (result.confidence >= 80) score += 3;
    else if (result.confidence >= 60) score += 2;
    else if (result.confidence >= 40) score += 1;

    // Did we find a vendor?
    if (result.vendor && result.vendor.length > 2) score += 2;

    // Did we find a date?
    if (result.date && result.date !== new Date().toISOString().slice(0, 10)) score += 2;

    // Did we find a total?
    if (result.total > 0) score += 3;

    // Did we find line items?
    if (result.lineItems && result.lineItems.length > 0) score += 1;

    // Raw text length (very short = probably bad scan)
    if (result.rawText.length > 100) score += 1;

    if (score >= 9) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  /**
   * Generate user-friendly quality message
   */
  function getQualityMessage(quality) {
    switch (quality) {
      case 'high':
        return 'Great scan! All key fields were extracted successfully.';
      case 'medium':
        return 'Partial extraction — please review and correct the fields below.';
      case 'low':
        return 'Low quality scan. Please check all fields carefully or try re-scanning.';
      default:
        return '';
    }
  }

  // ═══════════════════════════════════════════════
  //  RESULT FORMATTING
  //  Convert OCR result to expense-ready object
  // ═══════════════════════════════════════════════

  /**
   * Convert OCR result to an expense object ready for the form
   */
  function toExpenseData(result) {
    if (!result || !result.success) return null;

    const expense = {
      date: result.date || new Date().toISOString().slice(0, 10),
      vendor: result.vendor || '',
      amount: result.total || 0,
      payment_method: result.paymentMethod || 'card',
      description: '',
      tags: '',
      category: '',
      subcategory: '',
      tax_line: ''
    };

    // Apply auto-categorization suggestion
    if (result.suggestedCategory) {
      expense.category = result.suggestedCategory.categoryId || '';
      expense.subcategory = result.suggestedCategory.subcategory || '';
      expense.tax_line = result.suggestedCategory.taxLine || '';
    }

    // Build description from line items
    if (result.lineItems && result.lineItems.length > 0) {
      const itemSummary = result.lineItems
        .slice(0, 10)
        .map(item => {
          const qty = item.quantity > 1 ? `${item.quantity}x ` : '';
          return `${qty}${item.name} ($${item.price.toFixed(2)})`;
        })
        .join('; ');

      expense.description = `Receipt items: ${itemSummary}`;
    }

    return expense;
  }

  // ═══════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════
  return {
    // Core
    processReceipt,
    processMultipleReceipts,
    terminateWorker,

    // File utilities
    fileToDataURL,
    validateFile,
    createThumbnail,

    // Result utilities
    toExpenseData,
    assessQuality,
    getQualityMessage,

    // State
    isProcessing: () => isProcessing,
    getLastResult: () => lastResult
  };

})();
