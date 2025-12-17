require('dotenv').config()
const { env } = require('process')
const { log, clearLogs } = require('./functions/logger')
const fs = require('fs')
const path = require('path')
const { generatePackYml } = require('./functions/generatePackYaml')
const { convertAllFiles } = require('./functions/nexo/convertItems')
const { convertAssets } = require('./functions/nexo/convertAssets')

inputFolderName = 'input'
outputFolderName = 'output'
const inputFolderPath = path.join(__dirname, inputFolderName)
const outputFolderPath = path.join(__dirname, outputFolderName)

const folders = ['logs', inputFolderName, outputFolderName]
const author = env.AUTHOR || 'Unknown'
const version = env.VERSION || '1.0.0'
const description = env.DESCRIPTION || 'Craft Engine Config Pack Converter'
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

function deleteFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true })
    loggerMain('info', `Deleted folder: ${folderPath}`)
  }
}

function startup() {
  clearLogs()
  deleteFolder(outputFolderPath)
  loggerStartup('info', 'Starting application...')
  initFolders()
  loggerStartup('info', 'Startup complete.')
}

function main() {
  startup()
  convertAllFiles(inputFolderPath, outputFolderPath, namespace)
  convertAssets(inputFolderPath, outputFolderPath)
  generatePackYml(outputFolderPath, {
    author: author,
    version: version,
    description: description,
    namespace: namespace
  })
}

main()
