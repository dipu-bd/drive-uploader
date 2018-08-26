import chalk from 'chalk'
import * as path from 'path'
import * as express from 'express'
import * as cookieParser from 'cookie-parser'
import * as logger from 'morgan'
import * as sass from 'node-sass-middleware'

declare var __DEV__: boolean

export class Server {
  public app: express.Express
  public port: number

  constructor () {
    this.app = express()
    this.port = this.getPort()
    this.setConfigs()
    this.setRoutes()
    this.start()
  }

  private getPort(): number {
    return parseInt(process.env.PORT, 10) || 3000
  }

  private start = (): void => {
    this.app.listen(this.port, this.onListen)
  }

  private onListen = (err: any): void => {
    if (err) {
      console.error(err)
      return
    }

    if (__DEV__) {
      console.log(chalk.bgGreen(' IN DEVELOPMENT MODE '), '\n')
    }

    console.log(chalk.dim('Server @'), `http://localhost:${this.port}`, '\n')
  }

  private setConfigs(): void {
    // setup middlewares
    this.app.use(logger(__DEV__ ? 'dev' : 'combined'))
    this.app.use(express.json())
    this.app.use(cookieParser())
    this.app.use(express.urlencoded({ extended: false }))
    // public folder
    this.app.use(express.static(path.join(__dirname, '../public')))
    // view engine setup
    this.app.set('views', path.join(__dirname, '../views'))
    this.app.set('view engine', 'pug')
    // style loader setup
    this.app.use(sass({
      src: path.join(__dirname, '../public'),
      dest: path.join(__dirname, '../public'),
      indentedSyntax: true, // true = .sass and false = .scss
      sourceMap: true
    }))
  }

  private setRoutes(): void {
    this.app.get('/', this.getHomepage)
  }

  private async getHomepage (req: express.Request, res: express.Response) {
    res.render('index.pug', { title: 'Express' })
  }
}

module.exports = new Server().app
