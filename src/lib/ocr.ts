/**
 * Client-side OCR using Tesseract.js.
 * Dynamically imported to avoid bloating the initial bundle.
 *
 * All errors are logged to Sentry via the logger module.
 */

import { logger, addBreadcrumb, withPerformance } from '@/lib/logger';

export interface ReceiptData {
  item_name:      string;
  store_name:     string;
  purchase_date:  string; // YYYY-MM-DD
  total:          string;
}

export async function extractReceiptData(imageDataUrl: string): Promise<ReceiptData> {
  // Dynamically import Tesseract.js to keep it out of the initial bundle
  const { createWorker } = await import('tesseract.js');

  const endPerformance = withPerformance('OCR', 'tesseract.recognize');

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    addBreadcrumb('OCR', 'Starting Tesseract worker', { imageLength: imageDataUrl.length });

    worker = await createWorker('eng');

    const { data } = await worker.recognize(imageDataUrl);

    // Tesseract doesn't return an error property - errors are thrown
    // If we get here, recognition succeeded (even with low confidence)

    endPerformance({
      confidence: data.confidence,
      textLength: data.text.length,
    });

    addBreadcrumb('OCR', 'Tesseract recognition complete', {
      confidence: data.confidence,
      textLength: data.text.length,
    });

    await worker.terminate();
    worker = null; // Prevent finally block from terminating again

    const text = data.text;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    logger.debug('OCR', 'Extracted text lines', { lineCount: lines.length, text: text.slice(0, 200) });

    return {
      item_name:      extractItemName(lines),
      store_name:     extractStoreName(lines),
      purchase_date:  extractDate(lines),
      total:          extractTotal(lines),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    endPerformance({ error: true });

    logger.error('OCR', `extractReceiptData failed: ${errorMessage}`, {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      imageLength: imageDataUrl.length,
    });

    throw err;
  } finally {
    // Always clean up the worker
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore termination errors
      }
    }
  }
}

function extractStoreName(lines: string[]): string {
  // Store name is usually one of the first few non-empty lines
  // Skip lines that look like addresses, phone numbers, or dates
  for (const line of lines.slice(0, 5)) {
    const clean = line.trim();
    if (!clean) continue;
    // Skip if it looks like an address component
    if (/^\d+\s/.test(clean)) continue;           // starts with number (address)
    if (/^(street|st|ave|avenue|blvd|road|rd|dr)/i.test(clean)) continue;
    if (/^\(\d{3}\)/.test(clean)) continue;        // phone number
    if (/\d{2}[\/\-]\d{2}/.test(clean)) continue;  // date
    if (clean.length < 2) continue;
    // Looks like a store name
    return clean.slice(0, 80);
  }
  return '';
}

function extractItemName(lines: string[]): string {
  // Item name is typically a line with a price near the end
  // Look for lines with $ or currency symbols that aren't totals
  const pricePattern = /\$[\d,]+\.?\d*/;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (pricePattern.test(line) && !/total|subtotal|grand|amount|due/i.test(line)) {
      // Remove price from the end to get the item name
      const name = line.replace(pricePattern, '').replace(/\s+/g, ' ').trim();
      if (name.length > 2) return name.slice(0, 100);
    }
  }
  // Fallback: second non-address line
  return lines.find((l) => l.length > 2 && !/^\d+\s/.test(l)) ?? '';
}

function extractDate(lines: string[]): string {
  // Common date patterns on receipts
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // YYYY-MM-DD (ISO)
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    // DD MMM YYYY (e.g., 23 MAR 2025)
    /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})/i,
  ];

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  for (const line of lines) {
    // Try MM/DD/YYYY or MM-DD-YYYY
    let match = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
      const [, m, d, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Try YYYY-MM-DD
    match = line.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Try DD MMM YYYY
    match = line.match(/(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})/i);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${monthMap[m.toLowerCase()]}-${d.padStart(2, '0')}`;
    }
  }

  // Default to today
  const defaultDate = new Date().toISOString().split('T')[0];
  logger.debug('OCR', 'No date found in receipt, using today', { defaultDate });
  return defaultDate;
}

function extractTotal(lines: string[]): string {
  // Total is usually the largest dollar amount
  const totalPattern = /(?:total|grand\s*total|amount\s*due|balance)\s*\$?([\d,]+\.?\d*)/i;
  for (const line of lines) {
    const match = line.match(totalPattern);
    if (match) return `$${match[1]}`;
  }

  // Fallback: largest number with $
  const pricePattern = /\$?([\d,]+\.\d{2})/g;
  const prices: number[] = [];
  for (const line of lines) {
    let m;
    while ((m = pricePattern.exec(line)) !== null) {
      prices.push(parseFloat(m[1].replace(/,/g, '')));
    }
  }

  if (prices.length > 0) {
    const max = Math.max(...prices);
    return `$${max.toFixed(2)}`;
  }
  return '';
}
