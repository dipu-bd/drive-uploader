import { Request, Response, NextFunction } from 'express'
import { GoogleDrive } from '../services/google-drive'
import { IndexData } from '../models/index'
import { ErrorData } from '../models/error'
import { Downloader, DownloadItem } from '../services/downloader'

export class HomeController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.cookies.id
      const downloader = Downloader.getInstance(id)

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
      next(err)
    }
  }
}
