import { Request, Response, NextFunction } from 'express'
import { GoogleDrive } from '../services/google-drive'
import { ErrorData } from '../models/error'

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

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.cookies.id
      const token = await GoogleDrive.generateRefreshToken(id)
      GoogleDrive.saveAccessToken(id, token)
    } catch (err) {
      res.render('error', {
        error: err,
        message: err.message,
      } as ErrorData)
      next(err)
    }
  }
}
