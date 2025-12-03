import puppeteer, { type Browser, type Page } from "puppeteer"

let browserInstance: Browser | null = null

/**
 * Get or create a singleton browser instance
 * This ensures we reuse the same browser across requests
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined

  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--disable-web-security",
    ],
    executablePath,
  })

  return browserInstance
}

/**
 * Create a new page from the browser instance
 */
export async function createPage(): Promise<Page> {
  const browser = await getBrowser()
  return browser.newPage()
}

/**
 * Take a screenshot of a URL
 */
export async function takeScreenshot(
  url: string,
  options: {
    fullPage?: boolean
    width?: number
    height?: number
  } = {}
): Promise<Buffer> {
  const page = await createPage()

  try {
    if (options.width || options.height) {
      await page.setViewport({
        width: options.width ?? 1920,
        height: options.height ?? 1080,
      })
    }

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    })

    const screenshot = await page.screenshot({
      fullPage: options.fullPage ?? false,
      type: "png",
    })

    return Buffer.from(screenshot)
  } finally {
    await page.close()
  }
}

/**
 * Extract content from a URL (HTML or text)
 */
export async function extractContent(
  url: string,
  format: "html" | "text" = "html"
): Promise<string> {
  const page = await createPage()

  try {
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    })

    if (format === "text") {
      return await page.evaluate(() => {
        return document.body?.innerText || ""
      })
    }

    return await page.content()
  } finally {
    await page.close()
  }
}

/**
 * Close the browser instance (useful for cleanup)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}
