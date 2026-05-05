import puppeteer from 'puppeteer'

export async function browseUrl(url: string): Promise<string> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })

    const text = await page.evaluate(() => {
      const remove = document.querySelectorAll('script, style, nav, footer, header, aside, iframe')
      remove.forEach(el => el.remove())
      return document.body?.innerText ?? ''
    })

    return text.replace(/\s+/g, ' ').trim().slice(0, 4000)
  } finally {
    await browser.close()
  }
}
