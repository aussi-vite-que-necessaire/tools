import { describe, it, expect } from 'vitest';
import {
  splitPdf,
  mergePdfs,
  createZipFromPdfs,
  extractPageGroups,
} from '../../src/lib/pdf.js';
import { PDFDocument } from 'pdf-lib';

describe('PDF Library', () => {
  describe('splitPdf', () => {
    it('should split a PDF into individual pages', async () => {
      // Create a test PDF with 3 pages
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.addPage();
      pdf.addPage();
      const pdfBytes = await pdf.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      const pages = await splitPdf(pdfBuffer);

      expect(pages).toHaveLength(3);
      expect(pages.every((page) => Buffer.isBuffer(page))).toBe(true);

      // Verify each page is a valid PDF
      for (const pageBuffer of pages) {
        const pageDoc = await PDFDocument.load(pageBuffer);
        expect(pageDoc.getPageCount()).toBe(1);
      }
    });

    it('should handle a single-page PDF', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      const pages = await splitPdf(pdfBuffer);

      expect(pages).toHaveLength(1);
      const pageDoc = await PDFDocument.load(pages[0]);
      expect(pageDoc.getPageCount()).toBe(1);
    });

    it('should throw error for invalid PDF buffer', async () => {
      const invalidBuffer = Buffer.from('not a pdf');

      await expect(splitPdf(invalidBuffer)).rejects.toThrow();
    });
  });

  describe('mergePdfs', () => {
    it('should merge multiple PDFs into one', async () => {
      // Create multiple test PDFs
      const pdf1 = await PDFDocument.create();
      pdf1.addPage();
      const bytes1 = await pdf1.save();

      const pdf2 = await PDFDocument.create();
      pdf2.addPage();
      const bytes2 = await pdf2.save();

      const pdf3 = await PDFDocument.create();
      pdf3.addPage();
      const bytes3 = await pdf3.save();

      const merged = await mergePdfs([
        Buffer.from(bytes1),
        Buffer.from(bytes2),
        Buffer.from(bytes3),
      ]);

      expect(Buffer.isBuffer(merged)).toBe(true);
      const mergedDoc = await PDFDocument.load(merged);
      expect(mergedDoc.getPageCount()).toBe(3);
    });

    it('should handle merging a single PDF', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const merged = await mergePdfs([Buffer.from(pdfBytes)]);

      const mergedDoc = await PDFDocument.load(merged);
      expect(mergedDoc.getPageCount()).toBe(1);
    });

    it('should throw error for empty array', async () => {
      await expect(mergePdfs([])).rejects.toThrow();
    });

    it('should throw error for invalid PDF buffers', async () => {
      const invalidBuffer = Buffer.from('not a pdf');

      await expect(mergePdfs([invalidBuffer])).rejects.toThrow();
    });
  });

  describe('createZipFromPdfs', () => {
    it('should create a ZIP file from PDF buffers', async () => {
      const pdf1 = await PDFDocument.create();
      pdf1.addPage();
      const bytes1 = await pdf1.save();

      const pdf2 = await PDFDocument.create();
      pdf2.addPage();
      const bytes2 = await pdf2.save();

      const zipBuffer = await createZipFromPdfs([
        Buffer.from(bytes1),
        Buffer.from(bytes2),
      ]);

      expect(Buffer.isBuffer(zipBuffer)).toBe(true);
      expect(zipBuffer.length).toBeGreaterThan(0);
    });

    it('should handle empty array', async () => {
      const zipBuffer = await createZipFromPdfs([]);
      expect(Buffer.isBuffer(zipBuffer)).toBe(true);
    });

    it('should create ZIP with custom file names', async () => {
      const pdf1 = await PDFDocument.create();
      pdf1.addPage();
      const bytes1 = await pdf1.save();

      const pdf2 = await PDFDocument.create();
      pdf2.addPage();
      const bytes2 = await pdf2.save();

      const zipBuffer = await createZipFromPdfs(
        [Buffer.from(bytes1), Buffer.from(bytes2)],
        'custom.zip',
        ['file1.pdf', 'file2.pdf']
      );

      expect(Buffer.isBuffer(zipBuffer)).toBe(true);
      expect(zipBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('extractPageGroups', () => {
    it('should extract page groups from a PDF', async () => {
      // Create a test PDF with 5 pages
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.addPage();
      pdf.addPage();
      pdf.addPage();
      pdf.addPage();
      const pdfBytes = await pdf.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      // Extract groups: [0,1], [3,4]
      const groups = await extractPageGroups(pdfBuffer, [
        [0, 1],
        [3, 4],
      ]);

      expect(groups).toHaveLength(2);
      expect(groups.every((group) => Buffer.isBuffer(group))).toBe(true);

      // Verify first group has 2 pages
      const group1Doc = await PDFDocument.load(groups[0]);
      expect(group1Doc.getPageCount()).toBe(2);

      // Verify second group has 2 pages
      const group2Doc = await PDFDocument.load(groups[1]);
      expect(group2Doc.getPageCount()).toBe(2);
    });

    it('should extract single pages', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.addPage();
      pdf.addPage();
      const pdfBytes = await pdf.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      const groups = await extractPageGroups(pdfBuffer, [[0], [1], [2]]);

      expect(groups).toHaveLength(3);
      for (const group of groups) {
        const doc = await PDFDocument.load(group);
        expect(doc.getPageCount()).toBe(1);
      }
    });

    it('should handle non-consecutive pages', async () => {
      const pdf = await PDFDocument.create();
      // Create a PDF with 20 pages to accommodate the test indices
      for (let i = 0; i < 20; i++) {
        pdf.addPage();
      }
      const pdfBytes = await pdf.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      const groups = await extractPageGroups(pdfBuffer, [
        [1, 2],
        [5, 6, 8],
        [10, 12],
        [15],
      ]);

      expect(groups).toHaveLength(4);
      const group1Doc = await PDFDocument.load(groups[0]);
      expect(group1Doc.getPageCount()).toBe(2);

      const group2Doc = await PDFDocument.load(groups[1]);
      expect(group2Doc.getPageCount()).toBe(3);

      const group3Doc = await PDFDocument.load(groups[2]);
      expect(group3Doc.getPageCount()).toBe(2);

      const group4Doc = await PDFDocument.load(groups[3]);
      expect(group4Doc.getPageCount()).toBe(1);
    });

    it('should throw error for empty page groups array', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      await expect(extractPageGroups(pdfBuffer, [])).rejects.toThrow(
        'At least one page group is required'
      );
    });

    it('should throw error for empty page group', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      await expect(extractPageGroups(pdfBuffer, [[]])).rejects.toThrow(
        'Page groups cannot be empty'
      );
    });

    it('should throw error for out of range page index', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.addPage();
      const pdfBytes = await pdf.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      await expect(extractPageGroups(pdfBuffer, [[0, 5]])).rejects.toThrow(
        'Page index 5 is out of range'
      );
    });

    it('should throw error for negative page index', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      await expect(extractPageGroups(pdfBuffer, [[-1]])).rejects.toThrow(
        'out of range'
      );
    });

    it('should throw error for invalid PDF buffer', async () => {
      const invalidBuffer = Buffer.from('not a pdf');

      await expect(
        extractPageGroups(invalidBuffer, [[0]])
      ).rejects.toThrow();
    });
  });
});

