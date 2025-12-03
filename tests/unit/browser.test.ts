import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  getBrowser,
  createPage,
  takeScreenshot,
  extractContent,
  closeBrowser,
} from "../../src/lib/browser.js"

// Mock puppeteer
vi.mock("puppeteer", () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from("fake-image")),
    content: vi.fn().mockResolvedValue("<html><body>Test</body></html>"),
    evaluate: vi.fn().mockResolvedValue("Test content"),
    setViewport: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
  }

  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
  }

  return {
    default: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
  }
})

describe("Browser Library", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await closeBrowser()
  })

  describe("getBrowser", () => {
    it("should create a browser instance", async () => {
      const browser = await getBrowser()
      expect(browser).toBeDefined()
    })

    it("should reuse the same browser instance", async () => {
      const browser1 = await getBrowser()
      const browser2 = await getBrowser()
      expect(browser1).toBe(browser2)
    })
  })

  describe("createPage", () => {
    it("should create a new page", async () => {
      const page = await createPage()
      expect(page).toBeDefined()
    })
  })

  describe("takeScreenshot", () => {
    it("should take a screenshot of a URL", async () => {
      const puppeteer = await import("puppeteer")
      const mockBrowser = await puppeteer.default.launch({} as never)
      const mockPage = await mockBrowser.newPage()

      const result = await takeScreenshot("https://example.com")

      expect(Buffer.isBuffer(result)).toBe(true)
      expect(mockPage.goto).toHaveBeenCalledWith("https://example.com", {
        waitUntil: "networkidle2",
        timeout: 30000,
      })
      expect(mockPage.screenshot).toHaveBeenCalled()
      expect(mockPage.close).toHaveBeenCalled()
    })

    it("should respect fullPage option", async () => {
      const puppeteer = await import("puppeteer")
      const mockBrowser = await puppeteer.default.launch({} as never)
      const mockPage = await mockBrowser.newPage()

      await takeScreenshot("https://example.com", { fullPage: true })

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        fullPage: true,
        type: "png",
      })
    })

    it("should set viewport when dimensions are provided", async () => {
      const puppeteer = await import("puppeteer")
      const mockBrowser = await puppeteer.default.launch({} as never)
      const mockPage = await mockBrowser.newPage()

      await takeScreenshot("https://example.com", { width: 1920, height: 1080 })

      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 1920,
        height: 1080,
      })
    })
  })

  describe("extractContent", () => {
    it("should extract HTML content by default", async () => {
      const puppeteer = await import("puppeteer")
      const mockBrowser = await puppeteer.default.launch({} as never)
      const mockPage = await mockBrowser.newPage()

      const result = await extractContent("https://example.com")

      expect(typeof result).toBe("string")
      expect(mockPage.goto).toHaveBeenCalled()
      expect(mockPage.content).toHaveBeenCalled()
      expect(mockPage.close).toHaveBeenCalled()
    })

    it("should extract text content when format is text", async () => {
      const puppeteer = await import("puppeteer")
      const mockBrowser = await puppeteer.default.launch({} as never)
      const mockPage = await mockBrowser.newPage()

      const result = await extractContent("https://example.com", "text")

      expect(typeof result).toBe("string")
      expect(mockPage.evaluate).toHaveBeenCalled()
      expect(mockPage.close).toHaveBeenCalled()
    })
  })

  describe("closeBrowser", () => {
    it("should close the browser instance", async () => {
      await getBrowser()
      await closeBrowser()

      // Browser should be null after closing
      const puppeteer = await import("puppeteer")
      expect(puppeteer.default.launch).toHaveBeenCalled()
    })
  })
})
