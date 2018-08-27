import uuid from 'uuid'
import chalk from 'chalk'
import { Request, Response, NextFunction } from 'express'
import { GoogleDrive } from '../services/google-drive'

export default function (req: Request, res: Response, next: NextFunction) {
  // Generate user id
  let id = req.cookies.id
  if (!id || !id.length) {
    id = uuid.v4()
    res.cookie('id', id, {
      maxAge: 120 * 24 * 3600 * 1000, // 120 days
    })
    res.redirect(req.originalUrl)
    return console.log(chalk.dim('New id generated: '), chalk.blue(id))
  }
  next()
}

export function CheckToken(req: Request, res: Response, next: NextFunction) {
  // Check if has access token
  const id = req.cookies.id
  if (!GoogleDrive.hasAccessToken(id)) {
    console.log(chalk.dim('Getting new access token for'), chalk.blue(id))
    const authUrl = GoogleDrive.getAccessTokenUrl()
    return res.redirect(authUrl)
  }
  next()
}

export function ApiShield(req: Request, res: Response, next: NextFunction) {
  // Check if has access token
  const pass = req.query.pass
  if (pass !== 'sleepy_cat_in_a_box') {
    next(new Error('Not authorized'))
  }
  next()
}
