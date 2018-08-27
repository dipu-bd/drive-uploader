import chalk from 'chalk'
import fetch from 'node-fetch'
import { GoogleDrive } from './google-drive'

const cachedDownloader = new Map<string, Downloader>()

export class DownloadItem {
  readonly url: string
  readonly name: string
  readonly parent: Downloader

  progress: number = 0
  status: string = 'Pending'

  finished = false
  forceStop = false

  contentType = ''
  contentLength = 0
  contentStream?: NodeJS.ReadableStream
  driveUrl?: string

  constructor(url: string, parent: Downloader) {
    this.url = url
    this.parent = parent
    this.name = url.split('/').slice(-1)[0]
  }

  stop() {
    this.forceStop = true
  }

  delete() {
    if (!this.parent) return
    this.parent.removeItem(this.url)
  }
}

export class Downloader {
  readonly id: string
  concurrent: number = 3
  private items = new Map<string, DownloadItem>()

  private running = 0
  private queue = new Array<DownloadItem>()

  public static getInstance(id: string, create = true): Downloader {
    if (!cachedDownloader.has(id) && create) {
      cachedDownloader.set(id, new Downloader(id))
      console.log(chalk.dim('Created Downloader instance for'), chalk.blue(id))
    }
    return cachedDownloader.get(id) as Downloader
  }

  public static logoutSession(id: string) {
    const downloader = cachedDownloader.get(id)
    if (downloader) {
      downloader.queue = []
      downloader.list.forEach(v => v.forceStop = true)
    }
    cachedDownloader.delete(id)
  }

  public static *allSessions() {
    yield* cachedDownloader.keys()
  }

  private constructor(id: string) {
    this.id = id
  }

  get drive(): GoogleDrive {
    return GoogleDrive.getInstance(this.id)
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

  addToQueue(url: string) {
    // check url
    const checker: RegExp = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gi
    if (!checker.test(url)) {
      throw new Error('Invalid url')
    }
    if (url.endsWith('/')) {
      url = url.substr(0, url.length - 1)
    }
    // do not take if already exists
    if (this.items.has(url)) return
    // add to list
    const item = new DownloadItem(url, this)
    this.items.set(item.url, item)
    // add to queue and restart downloading
    this.queue.push(item)
    this.start()
  }

  removeItem(url: string) {
    this.items.delete(url)
  }

  /*-------------------------------------------------------------------------*\
  |                               DOWNLOADERS                                 |
  \*-------------------------------------------------------------------------*/

  async downloadItem(item: DownloadItem) {
    item.status = 'Getting metadata'
    await this.downloadFile(item)
    if (item.forceStop) return
    await this.uploadToDrive(item)
    item.finished = true
    this.running--
  }

  async downloadFile (item: DownloadItem) {
    if (item.finished || item.forceStop) return
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

  async uploadToDrive (item: DownloadItem) {
    if (item.finished || item.forceStop) return
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
      item.forceStop = true
    }
  }
}
