import { Request, Response, NextFunction } from 'express'
import { GoogleDrive } from '../services/google-drive'
import { ErrorData } from '../models/error'

export class AuthController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.cookies.id
      const code = req.query.code
      await GoogleDrive.setAccessToken(id, code)
      res.redirect('/')
    } catch (err) {
      res.render('error', {
        error: err,
        message: err.message,
      } as ErrorData)
      next(err)
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.cookies.id
      await GoogleDrive.getInstance(id).refreshToken()
    } catch (err) {
      res.render('error', {
        error: err,
        message: err.message,
      } as ErrorData)
      next(err)
    }
  }
}
