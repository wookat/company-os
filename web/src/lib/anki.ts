import JSZip from 'jszip'
import type { WrongQ } from './types'

declare global {
  interface Window {
    initSqlJs?: (cfg: { locateFile: (f: string) => string }) => Promise<SqlJs>
  }
}
interface SqlJs {
  Database: new () => {
    run: (sql: string, params?: unknown[]) => void
    export: () => Uint8Array
  }
}

async function loadSqlJs(): Promise<SqlJs> {
  if (!window.initSqlJs) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js'
      s.onload = () => res()
      s.onerror = () => rej(new Error('sql.js 加载失败'))
      document.head.appendChild(s)
    })
  }
  return window.initSqlJs!({
    locateFile: (f: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`,
  })
}

async function sha1hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function exportApkg(qs: WrongQ[], toast: (m: string, ok?: boolean) => void) {
  if (!qs.length) return toast('错题本为空')
  toast('正在打包 .apkg…', true)
  try {
    const SQL = await loadSqlJs()
    const db = new SQL.Database()
    const now = Date.now()
    const sec = Math.floor(now / 1000)
    const mid = now
    const did = now + 1
    db.run(`CREATE TABLE col (id integer primary key, crt integer, mod integer, scm integer, ver integer, dty integer, usn integer, ls integer, conf text, models text, decks text, dconf text, tags text);
CREATE TABLE notes (id integer primary key, guid text, mid integer, mod integer, usn integer, tags text, flds text, sfld text, csum integer, flags integer, data text);
CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer, mod integer, usn integer, type integer, queue integer, due integer, ivl integer, factor integer, reps integer, lapses integer, left integer, odue integer, odid integer, flags integer, data text);
CREATE TABLE revlog (id integer primary key, cid integer, usn integer, ease integer, ivl integer, lastIvl integer, factor integer, time integer, type integer);
CREATE TABLE graves (usn integer, oid integer, type integer);
CREATE INDEX ix_notes_usn on notes (usn); CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn); CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due); CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);`)
    const conf = {
      nextPos: 1,
      estTimes: true,
      activeDecks: [1],
      sortType: 'noteFld',
      timeLim: 0,
      sortBackwards: false,
      addToCur: true,
      curDeck: 1,
      newBury: true,
      newSpread: 0,
      dueCounts: true,
      curModel: String(mid),
      collapseTime: 1200,
    }
    const models: Record<number, unknown> = {}
    models[mid] = {
      id: mid,
      name: '真题工坊错题',
      type: 0,
      mod: sec,
      usn: -1,
      sortf: 0,
      did,
      tmpls: [
        { name: 'Card 1', ord: 0, qfmt: '{{正面}}', afmt: '{{FrontSide}}<hr id=answer>{{背面}}', bqfmt: '', bafmt: '', did: null },
      ],
      flds: [
        { name: '正面', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20 },
        { name: '背面', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20 },
      ],
      css: '.card{font-family:arial;font-size:18px;text-align:left;color:black;background-color:white;padding:12px}',
      latexPre: '',
      latexPost: '',
      req: [[0, 'all', [0]]],
    }
    const deckBase = {
      mod: sec,
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      conf: 1,
      desc: '',
      dyn: 0,
      collapsed: false,
      extendNew: 10,
      extendRev: 50,
    }
    const decks: Record<number, unknown> = {
      1: { ...deckBase, id: 1, name: 'Default' },
      [did]: { ...deckBase, id: did, name: '真题工坊·错题本' },
    }
    const dconf = {
      1: {
        id: 1,
        name: 'Default',
        mod: 0,
        usn: 0,
        maxTaken: 60,
        autoplay: true,
        timer: 0,
        replayq: true,
        new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20, separate: true },
        rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 100 },
        lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
        dyn: false,
      },
    }
    db.run('INSERT INTO col VALUES (1,?,?,?,11,0,0,0,?,?,?,?,?)', [
      sec,
      now,
      now,
      JSON.stringify(conf),
      JSON.stringify(models),
      JSON.stringify(decks),
      JSON.stringify(dconf),
      '{}',
    ])
    let id = now
    for (const q of qs) {
      const tag = q.qtype === 'multi' ? '【多选】' : '【单选】'
      const front = `${tag}${q.stem}<br><br>A. ${q.opt_a}<br>B. ${q.opt_b}<br>C. ${q.opt_c}<br>D. ${q.opt_d}`
      const back = `<b>答案：${q.answer}</b><br><br>${q.analysis}<br><br><i>考点：${q.knowledge_point}${q.subject ? ` · 科目：${q.subject}` : ''}</i>`
      const flds = front + '\x1f' + back
      const csum = parseInt((await sha1hex(front)).slice(0, 8), 16)
      const nid = ++id
      db.run("INSERT INTO notes VALUES (?,?,?,?,-1,'',?,?,?,0,'')", [nid, String(nid), mid, sec, flds, front.slice(0, 100), csum])
      db.run("INSERT INTO cards VALUES (?,?,?,0,?,-1,0,0,?,0,2500,0,0,0,0,0,0,'')", [++id, nid, did, sec, nid % 100000])
    }
    const data = db.export()
    const zip = new JSZip()
    zip.file('collection.anki2', data)
    zip.file('media', '{}')
    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `真题工坊错题_${new Date().toISOString().slice(0, 10)}.apkg`
    a.click()
    toast('已下载 .apkg，可直接导入 Anki', true)
  } catch (e) {
    toast((e as Error).message)
  }
}
