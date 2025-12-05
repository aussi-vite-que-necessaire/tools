import { describe, it, expect } from "vitest"
import app from "../../src/index"

describe("Tools API", () => {
    describe("POST /api/tools/qrcode", () => {
        it("should generate a PNG QR code", async () => {
            const formData = new FormData()
            formData.append("text", "https://n8n.io")
            formData.append("format", "png")

            const res = await app.request("/api/tools/qrcode", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(200)
            expect(res.headers.get("Content-Type")).toBe("image/png")
            const buffer = await res.arrayBuffer()
            expect(buffer.byteLength).toBeGreaterThan(100) // Should be a valid image

            // Verify PNG signature
            const signature = new Uint8Array(buffer.slice(0, 8))
            expect(Buffer.from(signature).toString("hex")).toBe("89504e470d0a1a0a")
        })

        it("should generate a QR code with specific dimensions", async () => {
            const width = 200
            const formData = new FormData()
            formData.append("text", "https://n8n.io")
            formData.append("format", "png")
            formData.append("width", width.toString())

            const res = await app.request("/api/tools/qrcode", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(200)
            const buffer = await res.arrayBuffer()

            // Read width from IHDR chunk (offset 16)
            const view = new DataView(buffer)
            const actualWidth = view.getUint32(16, false) // Big-endian
            expect(actualWidth).toBe(width)
        })

        it("should generate an SVG QR code", async () => {
            const formData = new FormData()
            formData.append("text", "https://n8n.io")
            formData.append("format", "svg")

            const res = await app.request("/api/tools/qrcode", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(200)
            expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
            const text = await res.text()
            expect(text).toContain("<svg")
        })
    })

    describe("POST /api/pdf/from-html", () => {
        it("should generate PDF from HTML", async () => {
            const formData = new FormData()
            formData.append("html", "<h1>Hello World</h1>")

            const res = await app.request("/api/pdf/from-html", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(200)
            expect(res.headers.get("Content-Type")).toBe("application/pdf")
            const buffer = await res.arrayBuffer()
            expect(buffer.byteLength).toBeGreaterThan(0)
            // PDF magic bytes: %PDF
            const header = new Uint8Array(buffer.slice(0, 4))
            expect(String.fromCharCode(...header)).toBe("%PDF")
        }, 30000) // Increase timeout for Puppeteer
    })

    describe("POST /api/tools/markdown", () => {
        it("should convert Markdown to HTML", async () => {
            const formData = new FormData()
            formData.append("markdown", "# Hello World\nThis is **bold**.")

            const res = await app.request("/api/tools/markdown", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(200)
            const data = await res.json()
            expect(data).toHaveProperty("html")
            expect(data.html).toContain("<h1>Hello World</h1>")
            expect(data.html).toContain("<strong>bold</strong>")
        })

        it("should return 400 if markdown is missing", async () => {
            const formData = new FormData()

            const res = await app.request("/api/tools/markdown", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(400)
            const data = await res.json()
            expect(data).toHaveProperty("error")
        })
    })
})
