const fs = require('fs')
const path = require('path')

const logsDir = path.join(__dirname, '..', 'logs')

/**
 * Deletes the entire logs folder
 */
function clearLogs() {
  if (fs.existsSync(logsDir)) {
    fs.rmSync(logsDir, { recursive: true, force: true })
    console.log('Logs folder deleted.')
  }
}

/**
 * Formats a Date object into YYYY-MM-DD HH:mm:ss
 */
function formatDate(date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
}

/**
 * Logs a message to console and a log file
 */
function log(message, level = 'info', moduleName = 'app') {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0] // for filename YYYY-MM-DD
  const logFileName = `${moduleName}-${dateStr}.log`
  const logFilePath = path.join(logsDir, logFileName)

  // Ensure folder exists only at the moment of writing
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  const timeStr = formatDate(date) // readable timestamp
  const logEntry = `[${timeStr}] [${level.toUpperCase()}] ${message}\n`
  fs.appendFileSync(logFilePath, logEntry, 'utf8')

  if (level === 'error') console.error(logEntry.trim())
  else if (level === 'warn') console.warn(logEntry.trim())
  else console.log(logEntry.trim())
}

module.exports = { log, clearLogs }
