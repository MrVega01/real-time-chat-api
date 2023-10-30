import { config } from 'dotenv'
config()

export const DB_INFO = {
  url: process.env.DB_URL,
  authToken: process.env.DB_TOKEN
}
