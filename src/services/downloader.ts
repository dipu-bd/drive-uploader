import fetch from 'node-fetch'
import { GoogleDrive } from './google-drive'

const cacheDownloader = new Map<string, Downloader>()

export class DownloadItem {
  readonly url: string
  readonly name: string

  progress: number = 0
  status: string = 'Pending'

  finished = false
  forceStop = false

  contentType = ''
  contentLength = 0

  private constructor(url: string) {
    this.url = url
    this.name = url.split('/').slice(-1)[0]
  }

  static createInstance (url: string): DownloadItem {
    const checker: RegExp = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gi
    if (!checker.test(url)) {
      throw new Error('Invalid url')
    }
    if (url.endsWith('/')) {
      url = url.substr(0, url.length - 1)
    }
    return new DownloadItem(url)
  }
}

export class Downloader {
  readonly drive: GoogleDrive
  concurrent: number = 3
  private items = new Map<string, DownloadItem>()

  private running = 0
  private queue = new Array<DownloadItem>()

  constructor(drive: GoogleDrive) {
    this.drive = drive
  }

  public static getInstance(drive: GoogleDrive): Downloader {
    const id = drive.id
    if (!cacheDownloader.has(id)) {
      cacheDownloader.set(id, new Downloader(drive))
    }
    return cacheDownloader.get(id) as Downloader
  }

  get list() {
    return [...this.items.values()]
  }

  start () {
    if (this.running > 0) return
    while (this.queue.length) {
      if (this.running <= this.concurrent) {
        this.running++
        const top = this.queue.shift()
        top && this.downloadItem(top)
      }
    }
  }

  addToQueue(item: DownloadItem) {
    if (this.items.has(item.url)) return
    this.items.set(item.url, item)
    this.queue.push(item)
    this.start()
  }

  async downloadItem(item: DownloadItem) {
    item.status = 'Getting metadata'
    await this.getMetadata(item)
    if (item.forceStop) return
    this.running--
  }

  async getMetadata (item: DownloadItem) {
    const res = await fetch(item.url)
    item.contentType = res.headers.get('content-type') || ''
    item.contentLength = Number.parseInt(res.headers.get('content-length') || '0', 10) || 0
    item.status = `Metadata: content-type=${item.contentType}, length=${item.contentLength}`
  }
}

/*
Headers {
  [Symbol(map)]: 
   { date: [ 'Sun, 26 Aug 2018 20:46:57 GMT' ],
     server: [ 'Apache' ],
     vary: [ 'Accept-Encoding' ],
     'last-modified': [ 'Thu, 18 Jul 2013 17:05:03 GMT' ],
     'accept-ranges': [ 'bytes' ],
     'content-length': [ '514414' ],
     'cache-control': [ 'max-age=604800, public, must-revalidate, proxy-revalidate' ],
     expires: [ 'Sun, 02 Sep 2018 20:46:57 GMT' ],
     pragma: [ 'public' ],
     'x-powered-by': [ 'W3 Total Cache/0.9.6' ],
     connection: [ 'close' ],
     'content-type': [ 'image/jpeg' ] } }
*/
