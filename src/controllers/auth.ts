import { Request, Response, NextFunction } from 'express'
import { GoogleDrive } from '../services/google-drive'
import { ErrorData } from '../models/error'
import { Downloader } from '../services/downloader';

export class AuthController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.cookies.id
      const code = req.query.code
      const token = await GoogleDrive.generateNewToken(id, code)
      GoogleDrive.saveAccessToken(id, token)
      res.redirect('/')
    } catch (err) {
      res.render('error', {
        error: err,
        message: err.message,
      } as ErrorData)
      next(err)
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.cookies.id
      Downloader.logoutSession(id)
      GoogleDrive.logoutSession(id)
      res.redirect('/')
    } catch (err) {
      res.render('error', {
        error: err,
        message: err.message,
      } as ErrorData)
      next(err)
    }
  }
}
