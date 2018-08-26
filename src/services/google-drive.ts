import chalk from 'chalk'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata'
]

export class GoogleDrive {
  credentials: any
  client?: OAuth2Client

  constructor() {
    this.loadCredentials()
  }

  loadCredentials() {
    try {
      this.credentials = require('../configs/credentials.json')
    } catch (err) {
      console.log(chalk.dim('Error: Failed to load credentials'))
      console.log(chalk.dim(err.stack))
    }
  }

  getAccessTokenUrl() {
    // Create a client with credentials
    const { client_secret, client_id, redirect_uris } = this.credentials.installed
    const client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    })
    return authUrl
  }

  async makeClient(token: any) {
    // Authorize a client with credentials
    const { client_secret, client_id, redirect_uris } = this.credentials.installed
    const client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    client.generateAuthUrl({
      scope: SCOPES
    })
    // Check if we have previously stored a token.
    client.setCredentials(token)
    return client
  }

  async listFiles() {
    if (!this.client) {
      throw new Error('No client found')
    }
    const drive = google.drive({
      version: 'v3',
      auth: this.client
    })
    const res = await drive.files.list({
      pageSize: 10
    })
    const files = res.data.files
    if (files && files.length) {
      console.log('Files:')
      files.map((file) => {
        console.log(`${file.name} (${file.id})`)
      })
    } else {
      console.log('No files found.')
    }
  }
}
