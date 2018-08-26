import { Request, Response } from 'express'
import { GoogleDrive } from '../services/google-drive'
import { IndexData } from '../models/index'
import { ErrorData } from '../models/error'

export class HomeController {
  static async get(req: Request, res: Response) {
    console.log(req.headers)
    // make sure they are logged in
    const token = req.cookies['_drive.token']
    if (!token || !token.length) {
      const auth = GoogleDrive.getAccessTokenUrl()
      res.redirect(auth)
      return
    }
    // generate page data
    try {
      const data = {} as IndexData
      data.token = token
      const drive = GoogleDrive.getInstance(token)
      data.files = await drive.listFiles()
      res.render('index', data)
    } catch (err) {
      res.render('error', { error: err, message: err.message } as ErrorData)
    }
  }
}
