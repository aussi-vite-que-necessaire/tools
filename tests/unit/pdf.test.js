import { describe, it, expect } from 'vitest';
import { splitPdf, mergePdfs, createZipFromPdfs } from '../../src/lib/pdf.js';
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
    });
});
//# sourceMappingURL=pdf.test.js.map