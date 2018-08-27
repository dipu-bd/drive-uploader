import { Request, Response, NextFunction } from 'express'
import { GoogleDrive } from '../services/google-drive'
import { IndexData } from '../models/index'
import { ErrorData } from '../models/error'
import { Downloader, DownloadItem } from '../services/downloader'

export class HomeController {
  static async get(req: Request, res: Response, next: NextFunction) {
    const id = req.cookies.id
    res.redirect('/' + id)
  }

  static async getId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id
      const downloader = Downloader.getInstance(id)

      const data = {} as IndexData
      data.items = downloader.list
      res.render('index', data)
    } catch (err) {
      res.render('error', { error: err, message: err.message } as ErrorData)
    }
  }

  static async postId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id
      const url = req.body.url
      const downloader = Downloader.getInstance(id)
      downloader.addToQueue(url)
      return res.redirect('/' + id)
    } catch (err) {
      res.render('error', { error: err, message: err.message } as ErrorData)
    }
  }
}
