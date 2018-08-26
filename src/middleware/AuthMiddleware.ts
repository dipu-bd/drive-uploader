import { Request, Response, NextFunction } from 'express'
import { GoogleDrive } from '../services/google-drive'

export function AuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies['_drive.token']
  if (!token || !token.length) {
    res.redirect(GoogleDrive.getAccessTokenUrl())
  } else {
    next()
  }
}
