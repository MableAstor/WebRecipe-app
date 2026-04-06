const mysql = require('mysql2/promise')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const url = new URL(process.env.DATABASE_URL)

const pool = mysql.createPool({
  host: url.hostname,
  port: Number(url.port),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace('/', ''),
  waitForConnections: true,
  connectionLimit: 10
})

module.exports = pool