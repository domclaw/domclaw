import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../domclaw.db')
const SCHEMA_PATH = join(__dirname, 'schema.sql')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

const schema = readFileSync(SCHEMA_PATH, 'utf-8')
db.exec(schema)

export default db
