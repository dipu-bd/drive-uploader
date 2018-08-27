import chalk from 'chalk'
import uuid from 'uuid'
import path from 'path'
import fs from 'fs-extra'
import fetch from 'node-fetch'
import download from 'download'
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
  driveUrl?: string

  tempFile = ''
  downloader: any
  contentType = ''
  contentLength = 0
  request?: any
  contentStream?: NodeJS.ReadableStream

  constructor(url: string, parent: Downloader) {
    this.url = url
    this.parent = parent
    this.name = url.split('/').slice(-1)[0]
  }

  stop() {
    if (this.finished || this.forceStop) return
    this.forceStop = true
    this.status = 'Stopping...'
    if (this.request) {
      this.request.abort()
    }
  }

  updateProgress(status: string, received: number) {
    if (this.forceStop) return
    this.status = status
    if (this.contentLength > 0) {
      this.progress = received * 100 / this.contentLength
      const done = Downloader.formatSize(received)
      const total = Downloader.formatSize(this.contentLength)
      this.status = `${status} ${this.progress.toFixed(2)}% (${done}/${total})`
    }
  }
}

export class Downloader {
  readonly id: string
  concurrent: number = 3
  private items = new Map<string, DownloadItem>()

  private interval: any
  private running = 0
  private queue = new Array<DownloadItem>()

  /*-------------------------------------------------------------------------*\
  |                             STATIC METHODS                                |
  \*-------------------------------------------------------------------------*/

  public static getInstance(id: string, create = true): Downloader {
    if (!cachedDownloader.has(id) && create) {
      cachedDownloader.set(id, new Downloader(id))
      console.log(chalk.dim('Created Downloader instance for'), chalk.blue(id))
    }
    const downloader = cachedDownloader.get(id) as Downloader
    downloader.start()
    return downloader
  }

  public static logoutSession(id: string) {
    const downloader = cachedDownloader.get(id)
    if (downloader) downloader.stop()
  }

  public static *allSessions() {
    yield* cachedDownloader.keys()
  }

  public static formatSize(size: number) {
    const suffix = ['B', 'KB', 'MB', 'GB']
    let index = 0
    while (size > 1024 && index < suffix.length) {
      size /= 1024
      index++
    }
    return `${size.toFixed(2)}${suffix[index]}`
  }

  /*-------------------------------------------------------------------------*\
  |                               LOCAL METHODS                               |
  \*-------------------------------------------------------------------------*/

  private constructor(id: string) {
    this.id = id
  }

  get drive(): GoogleDrive {
    return GoogleDrive.getInstance(this.id)
  }

  get list() {
    return [...this.items.values()].reverse()
  }

  async wait(ms: number) {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }

  start() {
    if (this.interval) return
    this.interval = setInterval(async () => this.downloader(), 1000)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.queue = []
    this.list.forEach(v => v.stop())
  }

  private async downloader () {
    await this.wait(1000)
    while (this.queue.length) {
      if (this.running <= this.concurrent) {
        const top = this.queue.shift()
        top && this.downloadItem(top)
        await this.wait(100)
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
  }

  removeItem(url: string): boolean {
    return !!this.items.delete(url)
  }

  stopItem(url: string): boolean {
    const item = this.items.get(url)
    if (!item) return false
    item.stop()
    return true
  }

  restartItem(url: string): boolean {
    const item = this.items.get(url)
    if (!item) return false
    if (!item.finished) {
      return false
    }
    this.removeItem(url)
    this.addToQueue(url)
    return true
  }

  /*-------------------------------------------------------------------------*\
  |                               DOWNLOADERS                                 |
  \*-------------------------------------------------------------------------*/

  async downloadItem(item: DownloadItem) {
    try {
      this.running++
      await this.getMetadata(item)
      // await this.downloadFile(item)
      await this.uploadToDrive(item)
      await this.cleanup(item)
    } finally {
      this.running--
    }
  }

  async getMetadata(item: DownloadItem) {
    if (item.finished || item.forceStop) return
    try {
      // get content type
      item.status = 'Getting metadata...'
      const meta = await fetch(item.url)
      item.contentType = meta.headers.get('content-type') || ''
      item.contentLength = Number.parseInt(meta.headers.get('content-length') || '0', 10) || 0
      item.contentStream = meta.body
    } catch (err) {
      item.status = err.stack.split('\n')[0]
      item.forceStop = true
    }
  }

  async downloadFile (item: DownloadItem) {
    if (item.finished || item.forceStop) return
    try {
      // create a temp file
      const tempPath = path.resolve(__dirname, '../../.downloads')
      const filename = uuid.v4()
      fs.ensureDirSync(tempPath)
      item.tempFile = path.join(tempPath, filename)

      // start downloading
      item.status = 'Downloading... '
      const downloader = download(item.url, tempPath, {
        filename: filename,
        retries: 3,
      })

      // check progress
      downloader.on('request', request => {
        item.request = request
      })
      downloader.on('downloadProgress', progress => {
        item.updateProgress('Downloading...', progress.transferred)
      })
      downloader.on('error', error => {
        item.status = error + ''
        item.forceStop = true
      })

      await downloader
      item.contentStream = fs.createReadStream(item.tempFile)
    } catch (err) {
      item.status = err.stack.split('\n')[0]
      item.forceStop = true
    }
  }

  async uploadToDrive (item: DownloadItem) {
    if (item.finished || item.forceStop) return
    try {
      // get and unlink the read stream
      const stream = item.contentStream
      if (item.forceStop || !stream) return
      item.contentStream = undefined

      // upload to drive
      await this.drive.createFile(item, stream)
    } catch (err) {
      console.error(err.stack)
      item.forceStop = true
      item.status = err.stack.split('\n')[0]
    }
  }

  async cleanup(item: DownloadItem) {
    try {
      // remove temp file
      if (fs.existsSync(item.tempFile)) {
        fs.unlinkSync(item.tempFile)
      }
      item.finished = true
      if (!item.forceStop) {
        item.status = 'Done'
      } else if (item.status === 'Stopping...') {
        item.status = 'Stopped'
      }
    } catch (err) {
      console.error(err.stack)
      item.status = 'Failed to cleanup'
    }
  }
}
