import fetch from 'node-fetch'
import { GoogleDrive } from './google-drive'

const cacheDownloader = new Map<string, Downloader>()

export class DownloadItem {
  readonly url: string
  readonly name: string

  progress: number = 0
  status: string = 'Pending'

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
  readonly list = new Array<DownloadItem>()
  concurrent: number = 3

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
    this.list.push(item)
    this.queue.push(item)
    this.start()
  }

  async downloadItem(item: DownloadItem) {
    item.status = 'Getting metadata'
    await this.getMetadata(item)
    this.running--
  }

  async getMetadata (item: DownloadItem) {
    const res = await fetch(item.url)
    console.log(res.headers)
  }
}
