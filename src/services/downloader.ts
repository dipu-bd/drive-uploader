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
  contentStream?: NodeJS.ReadableStream
  driveUrl?: string

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
    return [...this.items.values()].reverse()
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
    await this.createDriveFile(item)
    item.finished = true
    this.running--
  }

  async getMetadata (item: DownloadItem) {
    if (item.finished) return
    try {
      const res = await fetch(item.url)
      item.contentStream = res.body
      item.contentType = res.headers.get('content-type') || ''
      item.contentLength = Number.parseInt(res.headers.get('content-length') || '0', 10) || 0
      if (!item.contentType) {
        throw new Error('No content type')
      }
      if (!item.contentStream) {
        throw new Error('No content stream')
        item.finished = true
      }
      item.status = `Content type = '${item.contentType}', Length = ${item.contentLength} bytes`
    } catch (err) {
      item.status = err.stack.split('\n')[0]
      item.finished = true
    }
  }

  async createDriveFile (item: DownloadItem) {
    if (item.finished) return
    try {
      item.status = 'Creating download folder...'
      const folder = await this.drive.getOrCreateFolder('Downloads')
      item.status = 'Uploading file...'
      if (!item.contentStream) return
      const file = await this.drive.createFile(
        item.name,
        item.contentStream,
        folder,
        item.contentType,
      )
      item.driveUrl = `https://drive.google.com/file/d/${file.id}/view`
      item.status = 'Done'
    } catch (err) {
      console.error(err.stack)
      item.status = err.stack.split('\n')[0]
      item.finished = true
    }
  }
}
