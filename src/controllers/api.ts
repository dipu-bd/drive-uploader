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
    res.json(ids)
  }

  static async getDownload(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id
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

}
