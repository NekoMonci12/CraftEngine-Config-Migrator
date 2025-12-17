require('dotenv').config()
const { env } = require('process')
const { log, clearLogs } = require('./functions/logger')
const fs = require('fs')
const path = require('path')

const folders = ['logs', 'input', 'output']
const namespace = env.NAMESPACE || 'minecraft'

function loggerMain(level, message) {
  log(message, level, 'main')
}

function loggerStartup(level, message) {
  log(message, level, 'startup')
}

function initFolders() {
  folders.forEach(folder => {
    const folderPath = path.join(__dirname, folder)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
      loggerMain('info', `Created folder: ${folder}`)
    } else {
      loggerMain('info', `Folder already exists: ${folder}`)
    }
  })
}

function startup() {
  clearLogs()
  loggerStartup('info', 'Starting application...')
  initFolders()
  loggerStartup('info', 'Startup complete.')
}

function main() {
  startup()
}

main()
