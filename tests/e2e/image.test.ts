import { describe, it, expect } from "vitest"
import app from "../../src/index"
import sharp from "sharp"

describe("Image API", () => {
    // Create a simple test image (100x100 red square)
    const createTestImage = async () => {
        return sharp({
            create: {
                width: 100,
                height: 100,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
        })
            .png()
            .toBuffer()
    }

    describe("POST /api/image/metadata", () => {
        it("should return correct metadata", async () => {
            const imageBuffer = await createTestImage()
            const formData = new FormData()
            formData.append("file", new Blob([imageBuffer as any]), "test.png")

            const res = await app.request("/api/image/metadata", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(200)
            const data = await res.json()
            expect(data).toMatchObject({
                format: "png",
                width: 100,
                height: 100,
                channels: 4,
            })
        })
    })

    describe("POST /api/image/process", () => {
        it("should resize image", async () => {
            const imageBuffer = await createTestImage()
            const formData = new FormData()
            formData.append("file", new Blob([imageBuffer as any]), "test.png")
            formData.append("resize_width", "50")
            formData.append("resize_height", "50")

            const res = await app.request("/api/image/process", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(200)
            const buffer = await res.arrayBuffer()
            const metadata = await sharp(Buffer.from(buffer)).metadata()
            expect(metadata.width).toBe(50)
            expect(metadata.height).toBe(50)
        })

        it("should convert format", async () => {
            const imageBuffer = await createTestImage()
            const formData = new FormData()
            formData.append("file", new Blob([imageBuffer as any]), "test.png")
            formData.append("format", "webp")

            const res = await app.request("/api/image/process", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(200)
            expect(res.headers.get("Content-Type")).toBe("image/webp")
            const buffer = await res.arrayBuffer()
            const metadata = await sharp(Buffer.from(buffer)).metadata()
            expect(metadata.format).toBe("webp")
        })

        it("should crop image", async () => {
            const imageBuffer = await createTestImage()
            const formData = new FormData()
            formData.append("file", new Blob([imageBuffer as any]), "test.png")
            formData.append("crop_left", "0")
            formData.append("crop_top", "0")
            formData.append("crop_width", "50")
            formData.append("crop_height", "50")

            const res = await app.request("/api/image/process", {
                method: "POST",
                body: formData,
            })

            expect(res.status).toBe(200)
            const buffer = await res.arrayBuffer()
            const metadata = await sharp(Buffer.from(buffer)).metadata()
            expect(metadata.width).toBe(50)
            expect(metadata.height).toBe(50)
        })
    })
})
