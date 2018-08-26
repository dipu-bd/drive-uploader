import { Request, Response } from 'express'
import { GoogleDrive } from '../services/google-drive'
import { ErrorData } from '../models/error'

export class AuthController {
  static async get(req: Request, res: Response) {
    try {
      const code = req.query.code
      const token = await GoogleDrive.getAccessToken(code)
      res.cookie('_drive.token', token, {
        maxAge: 30 * 24 * 3600 * 1000,
      })
      res.redirect('/')
    } catch (err) {
      res.render('error', {
        error: err,
        message: err.message,
      } as ErrorData)
    }
  }
}
