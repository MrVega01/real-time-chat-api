import express from 'express'
import logger from 'morgan'
import { Server } from 'socket.io'
import { createServer } from 'node:http'
import cors from 'cors'
import { createClient } from '@libsql/client'
import { DB_INFO } from './utils/config.js'

// io => ALL CONNECTIONS
// socket => THAT CONNECTION

const app = express()
const server = createServer(app)
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 10000
  },
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

const db = createClient(DB_INFO)

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    username TEXT
  )
`)

app.use(cors())
app.use(logger('dev'))

io.on('connection', async (socket) => {
  console.log('an user has connected')

  socket.on('disconnect', () => {
    console.log('an user has disconnect')
  })
  socket.on('chat message', async (msg) => {
    let result
    const user = socket.handshake.auth.username

    try {
      result = await db.execute({
        sql: 'INSERT INTO messages (content, username) VALUES (:msg, :user)',
        args: { msg, user }
      })
    } catch (error) {
      console.error(error)
      return
    } finally {
      io.emit('chat message', {
        id: result.lastInsertRowid.toString(),
        message: msg,
        username: user
      })
    }
  })

  if (!socket.recovered) {
    try {
      const results = await db.execute('SELECT * FROM messages')

      results.rows.forEach(row => {
        socket.emit('chat message', {
          id: row.id.toString(),
          message: row.content,
          username: row.username
        })
      })
    } catch (error) {
      console.error(error)
    }
  }
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
