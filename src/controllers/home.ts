import { Request, Response } from 'express'
import { GoogleDrive } from '../services/google-drive'

export class HomeController {
  static get(req: Request, res: Response) {
    console.log(new GoogleDrive().getAccessTokenUrl())
    res.render('index', { title: 'Express' })
  }
}
