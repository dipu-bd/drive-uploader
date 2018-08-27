import chalk from 'chalk'
import * as path from 'path'
import express from 'express'
import logger from 'morgan'
import cookieParser from 'cookie-parser'
import nodeSass from 'node-sass-middleware'
import routes from './routes'

declare var __DEV__: boolean

require('dotenv').config()

export class Server {
  public app: express.Express
  public port: number

  constructor () {
    this.app = express()
    this.port = this.getPort()
    this.setupApp()
    this.start()
  }

  private getPort(): number {
    return parseInt(process.env.PORT || '3000', 10)
  }

  private start(): void {
    this.app.listen(this.port, (err: any): void => {
      if (err) {
        console.error(err)
        return
      }
      if (__DEV__) {
        console.log(chalk.bgGreen(' IN DEVELOPMENT MODE '), '\n')
      }
      console.log(chalk.dim('Server @'), `http://localhost:${this.port}`, '\n')
    })
  }

  private setupApp(): void {
    this.setupMiddlewares()
    this.setupView()
    this.setupSassLoader()
    this.app.use(routes)
  }

  private setupView() {
    // public folder
    this.app.use(express.static(path.join(__dirname, '../public')))
    // view engine setup
    this.app.set('views', path.join(__dirname, '../views'))
    this.app.set('view engine', 'pug')
  }

  private setupSassLoader() {
    // style loader setup
    this.app.use(nodeSass({
      src: path.join(__dirname, './assets'),
      dest: path.join(__dirname, '../public'),
      indentedSyntax: true, // true = .sass and false = .scss
      sourceMap: true,
      outputStyle: 'compressed',
    }))
  }

  private setupMiddlewares() {
    // setup middlewares
    this.app.use(logger(__DEV__ ? 'dev' : 'combined'))
    this.app.use(express.json())
    this.app.use(cookieParser())
    this.app.use(express.urlencoded({ extended: false }))
  }
}

module.exports = new Server().app
