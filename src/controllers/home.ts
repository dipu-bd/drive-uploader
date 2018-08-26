import { Request, Response } from 'express'
import { GoogleDrive } from '../services/google-drive'
import { IndexData } from '../models/index'
import { ErrorData } from '../models/error'
import { Downloader, DownloadItem } from '../services/downloader'

export class HomeController {
  static async get(req: Request, res: Response) {
    try {
      const token = JSON.parse(req.cookies['_drive.token'])
      const drive = GoogleDrive.getInstance(token)
      const downloader = Downloader.getInstance(drive)

      if (req.query.url) {
        const item = DownloadItem.createInstance(req.query.url)
        downloader.addToQueue(item)
        return res.redirect('/')
      }

      const data = {} as IndexData
      data.items = downloader.list
      res.render('index', data)
    } catch (err) {
      res.render('error', { error: err, message: err.message } as ErrorData)
    }
  }
}
