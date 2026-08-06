import { chromium } from 'playwright'
import fs from 'fs'

const OUT = '/home/ubuntu/zhentigongfang/public/pdf'
fs.mkdirSync(OUT, { recursive: true })

const targets = []
for (let y = 2010; y <= 2026; y++) targets.push({ url: `https://zhenti.zalize.com/zhenti/${y}`, file: `zhenti-${y}.pdf`, note: `${y} 年考研政治真题及答案解析` })
targets.push({ url: 'https://zhenti.zalize.com/zhenti/shizheng', file: 'shizheng-2026.pdf', note: '2026考研政治时政题库（形势与政策·月更）' })

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
for (const t of targets) {
  await page.goto(t.url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.evaluate((note) => {
    document.querySelectorAll('style[media="print"]').forEach((s) => s.remove())
    document.querySelectorAll('header,nav,footer,button,#stfab,#anchmore,.noprint,script').forEach((e) => e.remove())
    document.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href') || ''
      if (href.startsWith('/app2') || href.startsWith('/zhenti') || href === '/') {
        const s = document.createElement('span')
        s.textContent = ''
        a.replaceWith(s)
      }
    })
    // 去掉纯网页交互控件：跳到题号格、本卷考点 chips、答案速查表、点击提示
    ;[...document.querySelectorAll('p,div,details')].forEach((el) => {
      const t = (el.textContent || '').trim().replace(/^[^\u4e00-\u9fa5]+/, '')
      if (/^(跳到题号|本卷考点|答案速查表|点击题号|隐藏与解析|隐藏 ?\S* ?与解析)/.test(t) && t.length < 1500) el.remove()
    })
    // 链接剥离后遗留的孤行/分隔符残留
    ;[...document.querySelectorAll('p,div')].forEach((el) => {
      const t = (el.textContent || '').trim()
      if (el.children.length <= 3 && /^[·\s、,，.。/|—-]*$/.test(t)) el.remove()
      else if (/时间不够整卷/.test(t) && t.length < 60) el.textContent = '时间不够整卷？上真题工坊在线抽练：zhenti.zalize.com'
    })
    document.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''))
    document.body.style.background = '#fff'
    const bar = document.createElement('div')
    bar.style.cssText = 'margin:24px auto 0;max-width:48rem;padding:12px 16px;border:1px solid #ddd;border-radius:12px;font-size:12px;color:#475569;text-align:center'
    bar.innerHTML = `<b>真题工坊</b> · ${note}<br>免费在线刷题自动判分、错题本按遗忘曲线复习：<b>zhenti.zalize.com</b>（本 PDF 可自由转发）`
    document.body.appendChild(bar)
  }, t.note)
  await page.pdf({ path: `${OUT}/${t.file}`, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } })
  console.log('ok', t.file)
}
await browser.close()
