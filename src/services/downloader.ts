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
  contentStream?: NodeJS.ReadableStream

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

  /*-------------------------------------------------------------------------*\
  |                             STATIC METHODS                                |
  \*-------------------------------------------------------------------------*/

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
    await this.uploadToDrive(item)
    await this.cleanup(item)
    this.running--
  }

  async downloadFile (item: DownloadItem) {
    if (item.finished || item.forceStop) return
    try {
      // get content type
      const meta = await fetch(item.url)
      item.contentType = meta.headers.get('content-type') || ''
      item.contentLength = Number.parseInt(meta.headers.get('content-length') || '0', 10) || 0

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
      downloader.on('downloadProgress', progress => {
        item.progress = progress.percent
        item.status = `${progress.percent.toFixed(2)}% (${progress.transferred}/${progress.total})`
      })
      downloader.on('error', error => {
        item.status = error + ''
        item.forceStop = true
      })
      return downloader
    } catch (err) {
      item.status = err.stack.split('\n')[0]
      item.forceStop = true
    }
  }

  async uploadToDrive (item: DownloadItem) {
    if (item.finished || item.forceStop) return
    try {
      // create a read stream
      const stream = fs.createReadStream(item.tempFile)
      // create a folder
      item.status = 'Creating download folder...'
      const folder = await this.drive.getOrCreateFolder('Downloads')
      // upload current file
      item.status = 'Uploading file...'
      const file = await this.drive.createFile(
        item.name,
        stream,
        folder,
        item.contentType,
      )
      // set drive url
      item.driveUrl = `https://drive.google.com/file/d/${file.id}/view`
    } catch (err) {
      console.error(err.stack)
      item.status = err.stack.split('\n')[0]
      item.forceStop = true
    }
  }

  async cleanup(item: DownloadItem) {
    try {
      // remove temp file
      fs.unlinkSync(item.tempFile)
      item.finished = true
      item.status = 'Done'
    } catch (err) {
      console.error(err.stack)
      item.status = err.stack.split('\n')[0]
    }
  }
}
