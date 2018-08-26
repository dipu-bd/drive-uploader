import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

const credentials = require('../configs/credentials.json')

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
]

const REDIRECT_URI = 'http://localhost:3000/auth'

export class GoogleDrive {
  client: OAuth2Client

  constructor(client: OAuth2Client) {
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

  public static getInstance(token: string): GoogleDrive {
    const client = this.createClient()
    client.setCredentials(JSON.parse(token))
    return new GoogleDrive(client)
  }

  /*-------------------------------------------------------------------------*\
  |                             LOCAL METHODS                                 |
  \*-------------------------------------------------------------------------*/

  async listFiles() {
    if (!this.client) {
      throw new Error('No client found')
    }
    const drive = google.drive({
      version: 'v3',
      auth: this.client,
    })
    const res = await drive.files.list({
      pageSize: 10,
    })
    const files = res.data.files
    if (files && files.length) {
      return files.map(file => `${file.name} (${file.id})`)
    }
    return []
  }
}
