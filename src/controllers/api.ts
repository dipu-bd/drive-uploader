import { Request, Response, NextFunction } from 'express'
import { GoogleDrive } from '../services/google-drive'
import { Downloader } from '../services/downloader'

export class ApiController {
  static async listIds(req: Request, res: Response, next: NextFunction) {
    const ids = new Set<string>()
    for (const id of GoogleDrive.allSessions()) {
      ids.add(id)
    }
    for (const id of Downloader.allSessions()) {
      ids.add(id)
    }
    res.json([...ids.values()])
  }

  static async getDownload(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id || req.cookies.id
    const downloader = Downloader.getInstance(id)
    if (!downloader) {
      return res.status(500).send('No such downloader')
    }
    res.json(downloader.list.map(item => ({
      url: item.url,
      name: item.name,
      progress: item.progress,
      status: item.status,
      contentType: item.contentType,
      contentLength: item.contentLength,
      forceStop: item.forceStop,
      finished: item.finished,
      driveUrl: item.driveUrl,
    })))
  }

  static async stopDownload(req: Request, res: Response, next: NextFunction) {
    const id = req.cookies.id
    const url = req.query.url
    const downloader = Downloader.getInstance(id)
    if (!downloader) {
      return res.send('Invalid access')
    }
    if (!downloader.stopItem(url)) {
      return res.send('No such item')
    }
    return res.send('OK')
  }

  static async restartDownload(req: Request, res: Response, next: NextFunction) {
    const id = req.cookies.id
    const url = req.query.url
    const downloader = Downloader.getInstance(id)
    if (!downloader) {
      return res.send('Invalid access')
    }
    if (!downloader.restartItem(url)) {
      return res.send('No such item')
    }
    return res.send('OK')
  }

  static async removeDownload(req: Request, res: Response, next: NextFunction) {
    const id = req.cookies.id
    const url = req.query.url
    const downloader = Downloader.getInstance(id)
    if (!downloader) {
      return res.send('Invalid access')
    }
    if (!downloader.removeItem(url)) {
      return res.send('No such item')
    }
    return res.send('OK')
  }
}
