import { google, drive_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

const credentials = require('../configs/credentials.json')

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
]

const REDIRECT_URI = 'http://localhost:3000/auth'

const cachedInstances = new Map<string, GoogleDrive>()

export class GoogleDrive {
  readonly id: string
  client: OAuth2Client

  constructor(id: string, client: OAuth2Client) {
    this.id = id
    this.client = client
  }

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

  public static async getAccessToken(code: string): Promise<string> {
    const client = this.createClient()
    const { tokens } = await client.getToken(code)
    return JSON.stringify(tokens)
  }

  public static getInstance(token: any): GoogleDrive {
    const id = token.access_token
    if (!cachedInstances.has(id)) {
      const client = this.createClient()
      client.setCredentials(token)
      const gdrive = new GoogleDrive(id, client)
      cachedInstances.set(id, gdrive)
    }
    return cachedInstances.get(id) as GoogleDrive
  }

  /*-------------------------------------------------------------------------*\
  |                             LOCAL METHODS                                 |
  \*-------------------------------------------------------------------------*/

  get agent(): drive_v3.Drive {
    return google.drive({
      version: 'v3',
      auth: this.client,
    })
  }

  async listFiles() {
    const res = await this.agent.files.list({
      corpora: 'user',
      includeTeamDriveItems: false,
    })
    const files = res.data.files
    if (files && files.length) {
      return files.map(file => `${file.name} (${file.id})`)
    }
    return []
  }

  async createFile() {
    this.agent.files.create()
  }
}
