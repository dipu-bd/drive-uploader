import chalk from 'chalk'
import { google, drive_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { Credentials } from 'google-auth-library/build/src/auth/credentials';
import { DownloadItem } from './downloader'

const credentials = require('../configs/credentials.json')

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
]

const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth'

const cachedTokens = new Map<string, Credentials>()
const cachedClients = new Map<string, OAuth2Client>()
const cachedGoogleDrives = new Map<string, GoogleDrive>()

export class GoogleDrive {
  readonly id: string

  /*-------------------------------------------------------------------------*\
  |                            STATIC METHODS                                 |
  \*-------------------------------------------------------------------------*/

  private static createClient(): OAuth2Client {
    const { client_secret, client_id } = credentials.web
    const client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI)
    return client
  }

  public static getAccessTokenUrl(): string {
    const client = this.createClient()
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    })
    return authUrl
  }

  public static hasAccessToken(id: string) {
    return cachedTokens.has(id) && cachedClients.has(id)
  }

  public static saveAccessToken(id: string, tokens: Credentials) {
    const client = this.createClient()
    cachedTokens.set(id, tokens)
    console.log(chalk.dim('Set new access token for'), chalk.blue(id))
    client.setCredentials(tokens)
    cachedClients.set(id, client)
    console.log(chalk.dim('Generated new client for'), chalk.blue(id))
  }

  public static getInstance(id: string): GoogleDrive {
    if (!cachedGoogleDrives.has(id)) {
      cachedGoogleDrives.set(id, new GoogleDrive(id))
      console.log(chalk.dim('Created GoogleDrive instance for'), chalk.blue(id))
    }
    return cachedGoogleDrives.get(id) as GoogleDrive
  }

  public static async generateNewToken(id: string, code: string) {
    const client = this.createClient()
    const res = await client.getToken(code)
    console.log(chalk.dim('Generated new token for'), chalk.blue(id))
    return res.tokens
  }

  public static async generateRefreshToken(id: string) {
    const client = cachedClients.get(id) as OAuth2Client
    if (!client) throw new Error('No client found for ' + id)
    const res = await client.refreshAccessToken()
    return res.credentials
  }

  public static logoutSession(id: string) {
    cachedTokens.delete(id)
    cachedClients.delete(id)
    cachedGoogleDrives.delete(id)
  }

  public static *allSessions() {
    yield* cachedTokens.keys()
    yield* cachedClients.keys()
    yield* cachedGoogleDrives.keys()
  }

  /*-------------------------------------------------------------------------*\
  |                             LOCAL METHODS                                 |
  \*-------------------------------------------------------------------------*/

  private constructor(id: string) {
    this.id = id
  }

  get client(): OAuth2Client {
    return cachedClients.get(this.id) as OAuth2Client
  }

  get agent(): drive_v3.Drive {
    return google.drive({
      version: 'v3',
      auth: this.client,
    })
  }

  async findFileByName(name: string, folder?: string) {
    let response = await this.agent.files.list({
      q: `name = '${name}'` +
        (folder ? `and '${folder}' in parents` : ''),
    })
    if (response.data.files) {
      return response.data.files
    }
    return []
  }

  async getOrCreateFolder(name: string, folder?: string) {
    // Try to find folder
    const files = await this.findFileByName(name, folder)
    if (files.length) return files[0].id
    // Otherwise, create new folder
    const response = await this.agent.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Created by https://gitlab.com/dipu-bd/drive-uploader',
        parents: folder ? [ folder ] : undefined,
      },
    })
    return response.data.id
  }

  async createFile(item: DownloadItem, stream: NodeJS.ReadableStream) {
    // create a folder
    item.status = 'Creating download folder...'
    const folder = await this.getOrCreateFolder('Downloads')

    // upload current file
    item.status = 'Uploading file...'
    const response = await this.agent.files.create({
      requestBody: {
        name: item.name,
        mimeType: item.contentType,
        parents: folder ? [ folder ] : undefined,
      },
      media: {
        mediaType: item.contentType,
        body: stream,
      },
    }, {
      maxRedirects: 0,
      maxContentLength: 128 * 1024 * 1024 * 1024,
      onUploadProgress(progress) {
        item.updateProgress('Uploading...', progress.bytesRead)
      },
    })

    const file = response.data
    item.driveUrl = `https://drive.google.com/file/d/${file.id}/view`
    return file
  }

}
