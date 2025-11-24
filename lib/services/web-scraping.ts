/**
 * Advanced Web Scraping Service
 * Uses Puppeteer for dynamic content scraping with anti-bot measures
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import * as cheerio from 'cheerio'
import axios from 'axios'

export interface ScrapingOptions {
  waitFor?: number
  screenshot?: boolean
  javascript?: boolean
  userAgent?: string
  headers?: Record<string, string>
  timeout?: number
  retries?: number
}

export interface ScrapedData {
  url: string
  title: string
  content: string
  html: string
  images: string[]
  links: string[]
  metadata: Record<string, any>
  screenshot?: string // base64
  statusCode?: number
}

export class WebScrapingService {
  private browser?: Browser
  private activeSessions: number = 0
  private maxSessions: number = 5
  private requestDelay: number = 1000 // Rate limiting
  private useJinaReader: boolean = true // Fast scraping with Jina Reader API

  // Protected URLs that will always fail
  private protectedUrlPatterns = [
    'developer.apple.com/app-store',
    'developer.apple.com/help',
    'developer.apple.com/documentation',
    'support.apple.com',
    'appleid.apple.com',
    'login.',
    'signin.',
    'auth.',
    'account.',
    'example.com',
  ]

  /**
   * Check if URL is safe to scrape
   */
  private isSafeUrl(url: string): boolean {
    return !this.protectedUrlPatterns.some(pattern => url.includes(pattern))
  }

  /**
   * Scrape with Jina Reader API (ultra-fast, no browser needed)
   */
  private async scrapeWithJina(url: string): Promise<ScrapedData | null> {
    try {
      const response = await axios.get(`https://r.jina.ai/${url}`, {
        headers: {
          'X-Return-Format': 'text',
          'X-With-Links-Summary': 'true',
          'X-With-Images-Summary': 'true',
        },
        timeout: 30000,
      })

      if (response.status !== 200) {
        return null
      }

      const content = response.data
      const lines = content.split('\n')
      const title = lines[0]?.replace(/^#\s*/, '') || 'Untitled'
      
      return {
        url,
        title,
        content: content.slice(0, 10000),
        html: '',
        images: [],
        links: [],
        metadata: { source: 'jina-reader', fast: true },
        statusCode: response.status,
      }
    } catch (error) {
      console.warn(`Jina Reader failed for ${url}, falling back to Puppeteer`)
      return null
    }
  }

  /**
   * Initialize browser for dynamic scraping
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
          '--disable-blink-features=AutomationControlled',
        ],
      })
    }
    return this.browser
  }

  /**
   * Scrape a single URL with dynamic content support
   * Includes automatic retries and smart fallbacks
   */
  async scrape(url: string, options: ScrapingOptions = {}): Promise<ScrapedData> {
    // Filter out protected URLs
    if (!this.isSafeUrl(url)) {
      console.warn(`Skipping protected URL: ${url}`)
      return {
        url,
        title: 'Protected URL',
        content: 'This URL cannot be scraped (protected/auth required)',
        html: '',
        images: [],
        links: [],
        metadata: { source: 'blocked', protected: true },
        statusCode: 403,
      }
    }

    const maxRetries = options.retries || 3
    let lastError: Error | null = null

    // Retry loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this._scrapeInternal(url, options)
      } catch (error) {
        lastError = error as Error
        console.warn(`Scrape attempt ${attempt}/${maxRetries} failed for ${url}:`, lastError.message)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Scraping failed after retries')
  }

  /**
   * Internal scrape method (called by retry wrapper)
   */
  private async _scrapeInternal(url: string, options: ScrapingOptions = {}): Promise<ScrapedData> {
    // Rate limiting
    if (this.activeSessions >= this.maxSessions) {
      await this.delay(this.requestDelay)
    }

    this.activeSessions++

    try {
      // Try Jina Reader first (ultra-fast: 150-300ms)
      if (this.useJinaReader && options.javascript !== true) {
        const jinaResult = await this.scrapeWithJina(url)
        if (jinaResult) {
          return jinaResult
        }
      }

      // Fallback to Puppeteer for JavaScript-heavy sites
      if (options.javascript !== false) {
        return await this.scrapeDynamic(url, options)
      }
      
      // Use axios + cheerio for simple static sites (faster)
      return await this.scrapeStatic(url, options)
    } finally {
      this.activeSessions--
    }
  }

  /**
   * Static scraping with Cheerio (faster, no JS)
   */
  private async scrapeStatic(url: string, options: ScrapingOptions): Promise<ScrapedData> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': options.userAgent || this.getRandomUserAgent(),
        ...options.headers,
      },
      timeout: options.timeout || 30000,
      maxRedirects: 5,
    })

    const $ = cheerio.load(response.data)

    // Extract content
    const title = $('title').text() || $('h1').first().text()
    
    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header').remove()
    const content = $('body').text().trim().replace(/\s+/g, ' ')

    // Extract images
    const images: string[] = []
    $('img').each((_, el) => {
      const src = $(el).attr('src')
      if (src) {
        images.push(this.resolveUrl(url, src))
      }
    })

    // Extract links
    const links: string[] = []
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        links.push(this.resolveUrl(url, href))
      }
    })

    // Extract metadata
    const metadata: Record<string, any> = {}
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property')
      const content = $(el).attr('content')
      if (name && content) {
        metadata[name] = content
      }
    })

    return {
      url,
      title,
      content: content.slice(0, 10000), // Limit content size
      html: response.data,
      images: images.slice(0, 50),
      links: links.slice(0, 100),
      metadata,
      statusCode: response.status,
    }
  }

  /**
   * Dynamic scraping with Puppeteer (handles JS)
   */
  private async scrapeDynamic(url: string, options: ScrapingOptions): Promise<ScrapedData> {
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    try {
      // Set user agent and viewport with stealth settings
      await page.setUserAgent(options.userAgent || this.getRandomUserAgent())
      await page.setViewport({ width: 1920, height: 1080 })
      
      // Additional stealth measures
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
      })

      // Set extra headers
      if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers)
      }

      // Block unnecessary resources for faster loading
      await page.setRequestInterception(true)
      page.on('request', (request) => {
        const resourceType = request.resourceType()
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort()
        } else {
          request.continue()
        }
      })

      // Navigate to page with optimized timeout and wait strategy
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded', // Faster than networkidle2
        timeout: options.timeout || 30000,
      })

      // Wait for dynamic content
      if (options.waitFor) {
        await page.waitForTimeout(options.waitFor)
      }

      // Extract data
      const data = await page.evaluate(() => {
        // Remove unwanted elements
        const unwantedSelectors = 'script, style, nav, footer, header, .ad, .advertisement'
        document.querySelectorAll(unwantedSelectors).forEach(el => el.remove())

        const title = document.title || document.querySelector('h1')?.textContent || ''
        const content = document.body.innerText.trim().replace(/\s+/g, ' ')

        const images = Array.from(document.querySelectorAll('img'))
          .map(img => img.src)
          .filter(Boolean)

        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => (a as HTMLAnchorElement).href)
          .filter(Boolean)

        const metadata: Record<string, any> = {}
        document.querySelectorAll('meta').forEach(meta => {
          const name = meta.getAttribute('name') || meta.getAttribute('property')
          const content = meta.getAttribute('content')
          if (name && content) {
            metadata[name] = content
          }
        })

        return { title, content, images, links, metadata }
      })

      // Get HTML
      const html = await page.content()

      // Screenshot if requested
      let screenshot: string | undefined
      if (options.screenshot) {
        const buffer = await page.screenshot({ fullPage: false })
        screenshot = buffer.toString('base64')
      }

      return {
        url,
        title: data.title,
        content: data.content.slice(0, 10000),
        html,
        images: data.images.slice(0, 50),
        links: data.links.slice(0, 100),
        metadata: data.metadata,
        screenshot,
        statusCode: response?.status(),
      }
    } finally {
      await page.close()
    }
  }

  /**
   * Scrape multiple URLs in parallel (with rate limiting)
   */
  async scrapeMultiple(urls: string[], options: ScrapingOptions = {}): Promise<ScrapedData[]> {
    // Pre-filter protected URLs
    const safeUrls = urls.filter(url => {
      const safe = this.isSafeUrl(url)
      if (!safe) {
        console.warn(`Skipping protected URL in batch: ${url}`)
      }
      return safe
    })

    if (safeUrls.length === 0) {
      console.warn('All URLs in batch were protected/blocked')
      return []
    }

    const results: ScrapedData[] = []
    const batchSize = 3 // Process 3 URLs at a time

    for (let i = 0; i < safeUrls.length; i += batchSize) {
      const batch = safeUrls.slice(i, i + batchSize)
      const batchPromises = batch.map(url => 
        this.scrape(url, options).catch(error => {
          console.error(`Failed to scrape ${url}:`, error.message)
          return null
        })
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter((r): r is ScrapedData => r !== null))

      // Delay between batches
      if (i + batchSize < urls.length) {
        await this.delay(this.requestDelay)
      }
    }

    return results
  }

  /**
   * Extract specific data using CSS selectors
   */
  async extractData(
    url: string,
    selectors: Record<string, string>,
    options: ScrapingOptions = {}
  ): Promise<Record<string, any>> {
    const scraped = await this.scrape(url, options)
    const $ = cheerio.load(scraped.html)

    const extracted: Record<string, any> = {}
    for (const [key, selector] of Object.entries(selectors)) {
      const element = $(selector)
      if (element.length > 1) {
        // Multiple elements - return array
        extracted[key] = element.map((_, el) => $(el).text().trim()).get()
      } else {
        // Single element
        extracted[key] = element.text().trim()
      }
    }

    return extracted
  }

  /**
   * Scrape LinkedIn profile (requires authentication)
   */
  async scrapeLinkedIn(profileUrl: string, cookies?: any[]): Promise<any> {
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    try {
      // Set cookies if provided
      if (cookies) {
        await page.setCookie(...cookies)
      }

      await page.goto(profileUrl, { waitUntil: 'networkidle2' })

      // Extract profile data
      const profile = await page.evaluate(() => {
        return {
          name: document.querySelector('.top-card-layout__title')?.textContent?.trim(),
          headline: document.querySelector('.top-card-layout__headline')?.textContent?.trim(),
          location: document.querySelector('.top-card__subline-item')?.textContent?.trim(),
          // Add more selectors as needed
        }
      })

      return profile
    } finally {
      await page.close()
    }
  }

  /**
   * Clean up resources
   */
  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = undefined
    }
  }

  // Helper methods
  private resolveUrl(base: string, relative: string): string {
    try {
      return new URL(relative, base).href
    } catch {
      return relative
    }
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    ]
    return userAgents[Math.floor(Math.random() * userAgents.length)]
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
let scrapingService: WebScrapingService | null = null

export function getScrapingService(): WebScrapingService {
  if (!scrapingService) {
    scrapingService = new WebScrapingService()
  }
  return scrapingService
}
