import app from './src/index.js';

const formData = new FormData();
const { PDFDocument } = await import("pdf-lib");
const pdf = await PDFDocument.create();
pdf.addPage();
const pdfBytes = await pdf.save();
const blob = new Blob([pdfBytes], { type: "application/pdf" });
formData.append("file", blob, "test.pdf");

const res = await app.request("/api/pdf/extract", {
  method: "POST",
  body: formData,
});

console.log("Status:", res.status);
const data = await res.json();
console.log("Response:", JSON.stringify(data, null, 2));
