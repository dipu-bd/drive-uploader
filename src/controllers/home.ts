import { Request, Response } from 'express'

export class HomeController {
  static get(req: Request, res: Response) {
    res.render('index', { title: 'Express' })
  }
}
