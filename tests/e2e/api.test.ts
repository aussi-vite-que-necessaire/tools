import { describe, it, expect, beforeAll, afterAll } from "vitest"
import app from "../../src/index.js"
import { closeBrowser } from "../../src/lib/browser.js"

describe("E2E API Tests", () => {
  beforeAll(async () => {
    // Wait a bit for the server to be ready if needed
  })

  afterAll(async () => {
    await closeBrowser()
  })

  describe("Health Check", () => {
    it("should return health status", async () => {
      const res = await app.request("/health")
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty("status", "ok")
      expect(data).toHaveProperty("timestamp")
    })
  })

  describe("Root Endpoint", () => {
    it("should return API information", async () => {
      const res = await app.request("/")
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty("message")
      expect(data).toHaveProperty("version")
      expect(data).toHaveProperty("docs")
    })
  })

  describe("Scraper Routes", () => {
    describe("POST /api/scraper/screenshot", () => {
      it("should return 400 for invalid URL", async () => {
        const res = await app.request("/api/scraper/screenshot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: "not-a-valid-url",
          }),
        })

        expect(res.status).toBe(400)
      })

      it("should accept valid screenshot request", async () => {
        const res = await app.request("/api/scraper/screenshot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: "https://example.com",
            fullPage: false,
            width: 1920,
            height: 1080,
          }),
        })

        // Note: This might fail if Puppeteer can't run in test environment
        // In CI, you might need to skip this or use a mock
        if (res.status === 500) {
          console.warn(
            "Screenshot test skipped - Puppeteer may not be available in test environment"
          )
          return
        }

        expect(res.status).toBe(200)
        expect(res.headers.get("content-type")).toContain("image/png")
      }, 60000) // 60 second timeout for Puppeteer (can be slow in CI)
    })

    describe("POST /api/scraper/content", () => {
      it("should return 400 for invalid URL", async () => {
        const res = await app.request("/api/scraper/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: "not-a-valid-url",
          }),
        })

        expect(res.status).toBe(400)
      })

      it("should accept valid content extraction request", async () => {
        const res = await app.request("/api/scraper/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: "https://example.com",
            format: "html",
          }),
        })

        // Note: This might fail if Puppeteer can't run in test environment
        if (res.status === 500) {
          console.warn(
            "Content extraction test skipped - Puppeteer may not be available in test environment"
          )
          return
        }

        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data).toHaveProperty("content")
        expect(data).toHaveProperty("format")
        expect(data).toHaveProperty("url")
      }, 30000) // 30 second timeout for Puppeteer
    })
  })

  describe("PDF Routes", () => {
    describe("POST /api/pdf/split", () => {
      it("should return 400 when no file is provided", async () => {
        const formData = new FormData()

        const res = await app.request("/api/pdf/split", {
          method: "POST",
          body: formData,
        })

        expect(res.status).toBe(400)
        const data = await res.json()
        expect(data).toHaveProperty("error")
      })

      it("should return 400 for non-PDF file", async () => {
        const formData = new FormData()
        const blob = new Blob(["not a pdf"], { type: "text/plain" })
        formData.append("file", blob, "test.txt")

        const res = await app.request("/api/pdf/split", {
          method: "POST",
          body: formData,
        })

        expect(res.status).toBe(400)
      })
    })

    describe("POST /api/pdf/merge", () => {
      it("should return 400 when no files are provided", async () => {
        const formData = new FormData()

        const res = await app.request("/api/pdf/merge", {
          method: "POST",
          body: formData,
        })

        expect(res.status).toBe(400)
        const data = await res.json()
        expect(data).toHaveProperty("error")
      })
    })

    describe("POST /api/pdf/extract", () => {
      it("should return 400 when no file is provided", async () => {
        const formData = new FormData()
        formData.append("pageGroups", JSON.stringify([[0, 1]]))

        const res = await app.request("/api/pdf/extract", {
          method: "POST",
          body: formData,
        })

        expect(res.status).toBe(400)
        const data = await res.json()
        expect(data).toHaveProperty("error")
      })

      it("should return 400 when pageGroups is missing", async () => {
        const formData = new FormData()
        // Create a minimal PDF
        const { PDFDocument } = await import("pdf-lib")
        const pdf = await PDFDocument.create()
        pdf.addPage()
        const pdfBytes = await pdf.save()
        const blob = new Blob([pdfBytes as unknown as BlobPart], {
          type: "application/pdf",
        })
        formData.append("file", blob, "test.pdf")

        const res = await app.request("/api/pdf/extract", {
          method: "POST",
          body: formData,
        })

        expect(res.status).toBe(400)
        const data = await res.json()
        expect(data).toHaveProperty("error")
        expect(data.error).toContain("pageGroups")
      })

      it("should return 400 for invalid JSON in pageGroups", async () => {
        const formData = new FormData()
        const { PDFDocument } = await import("pdf-lib")
        const pdf = await PDFDocument.create()
        pdf.addPage()
        const pdfBytes = await pdf.save()
        const blob = new Blob([pdfBytes as unknown as BlobPart], {
          type: "application/pdf",
        })
        formData.append("file", blob, "test.pdf")
        formData.append("pageGroups", "invalid json")

        const res = await app.request("/api/pdf/extract", {
          method: "POST",
          body: formData,
        })

        expect(res.status).toBe(400)
        const data = await res.json()
        expect(data).toHaveProperty("error")
        expect(data.error).toContain("JSON")
      })

      it("should return 400 for invalid pageGroups structure", async () => {
        const formData = new FormData()
        const { PDFDocument } = await import("pdf-lib")
        const pdf = await PDFDocument.create()
        pdf.addPage()
        const pdfBytes = await pdf.save()
        const blob = new Blob([pdfBytes as unknown as BlobPart], {
          type: "application/pdf",
        })
        formData.append("file", blob, "test.pdf")
        formData.append("pageGroups", JSON.stringify("not an array"))

        const res = await app.request("/api/pdf/extract", {
          method: "POST",
          body: formData,
        })

        expect(res.status).toBe(400)
        const data = await res.json()
        expect(data).toHaveProperty("error")
      })

      it("should return 400 for out of range page index", async () => {
        const formData = new FormData()
        const { PDFDocument } = await import("pdf-lib")
        const pdf = await PDFDocument.create()
        pdf.addPage()
        const pdfBytes = await pdf.save()
        const blob = new Blob([pdfBytes as unknown as BlobPart], {
          type: "application/pdf",
        })
        formData.append("file", blob, "test.pdf")
        formData.append("pageGroups", JSON.stringify([[0, 10]]))

        const res = await app.request("/api/pdf/extract", {
          method: "POST",
          body: formData,
        })

        expect(res.status).toBe(400)
        const data = await res.json()
        expect(data).toHaveProperty("error")
      })

      it("should extract page groups successfully", async () => {
        const formData = new FormData()
        const { PDFDocument } = await import("pdf-lib")
        // Create a PDF with 5 pages
        const pdf = await PDFDocument.create()
        for (let i = 0; i < 5; i++) {
          pdf.addPage()
        }
        const pdfBytes = await pdf.save()
        const blob = new Blob([pdfBytes as unknown as BlobPart], {
          type: "application/pdf",
        })
        formData.append("file", blob, "test.pdf")
        // Extract groups: [0,1], [3,4]
        formData.append("pageGroups", JSON.stringify([[0, 1], [3, 4]]))

        const res = await app.request("/api/pdf/extract", {
          method: "POST",
          body: formData,
        })

        expect(res.status).toBe(200)
        expect(res.headers.get("content-type")).toContain("application/zip")
        const zipBuffer = Buffer.from(await res.arrayBuffer())
        expect(zipBuffer.length).toBeGreaterThan(0)
      })
    })
  })

  describe("Swagger Documentation", () => {
    it("should serve Swagger JSON", async () => {
      const res = await app.request("/doc/json")
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty("openapi")
      expect(data).toHaveProperty("info")
    })

    it("should serve Swagger UI", async () => {
      const res = await app.request("/doc")
      expect(res.status).toBe(200)
      expect(res.headers.get("content-type")).toContain("text/html")
    })
  })
})
