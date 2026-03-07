require('dotenv').config()
const { env } = require('process')
const { log, clearLogs } = require('./functions/logger')
const fs = require('fs')
const path = require('path')
const { generatePackYml } = require('./functions/generatePackYaml')

inputFolderName = 'input'
outputFolderName = 'output'
const inputFolderPath = path.join(__dirname, inputFolderName)
const outputFolderPath = path.join(__dirname, outputFolderName)

const folders = ['logs', inputFolderName, outputFolderName]
const author = env.AUTHOR || 'Unknown'
const version = env.VERSION || '1.0.0'
const description = env.DESCRIPTION || 'Craft Engine Config Pack Converter'
const namespace = env.NAMESPACE || 'minecraft'
const format = env.FORMAT || 'auto'

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

function detectFormat(inputPath) {
  const nexoItemsPath = path.join(inputPath, 'items')
  const nexoPackPath = path.join(inputPath, 'pack')
  const iaItemsPacksPath = path.join(inputPath, 'items_packs')
  const iaResourcePackPath = path.join(inputPath, 'resource_pack')
  const iaResourcePackPath2 = path.join(inputPath, 'resourcepack')
  const iaContentsPath = path.join(inputPath, 'contents')

  const hasNexo = fs.existsSync(nexoItemsPath) && fs.existsSync(nexoPackPath)
  const hasItemsAdderV3 = fs.existsSync(iaItemsPacksPath) && (fs.existsSync(iaResourcePackPath) || fs.existsSync(iaResourcePackPath2))
  const hasItemsAdderV4 = fs.existsSync(iaContentsPath)

  if (hasNexo && !hasItemsAdderV3 && !hasItemsAdderV4) {
    return 'nexo'
  } else if (hasItemsAdderV4) {
    return 'itemsadder-v4'
  } else if (hasItemsAdderV3) {
    return 'itemsadder-v3'
  } else if (hasNexo) {
    loggerMain('warn', 'Multiple formats detected. Use FORMAT env variable to specify.')
    return 'nexo'
  } else {
    loggerMain('warn', 'Could not detect format. Defaulting to Nexo.')
    return 'nexo'
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

  let detectedFormat = format
  if (format === 'auto') {
    detectedFormat = detectFormat(inputFolderPath)
    loggerMain('info', `Auto-detected format: ${detectedFormat}`)
  } else {
    loggerMain('info', `Using specified format: ${detectedFormat}`)
  }

  if (detectedFormat === 'nexo') {
    const { convertAllFiles } = require('./functions/nexo/convertItems')
    const { convertAssets } = require('./functions/nexo/convertAssets')
    
    convertAllFiles(inputFolderPath, outputFolderPath, namespace)
    convertAssets(inputFolderPath, outputFolderPath)
  } else if (detectedFormat === 'itemsadder-v3' || detectedFormat === 'itemsadder') {
    const { convertAllFiles } = require('./functions/itemsadder/convertItems')
    const { convertAssets } = require('./functions/itemsadder/convertAssets')
    
    convertAllFiles(inputFolderPath, outputFolderPath, namespace)
    convertAssets(inputFolderPath, outputFolderPath)
  } else if (detectedFormat === 'itemsadder-v4') {
    const { convertAllFiles } = require('./functions/itemsadder/convertItemsV4')
    const { convertAssets } = require('./functions/itemsadder/convertAssetsV4')
    
    convertAllFiles(inputFolderPath, outputFolderPath, namespace)
    convertAssets(inputFolderPath, outputFolderPath)
  } else {
    loggerMain('error', `Unknown format: ${detectedFormat}`)
    return
  }

  generatePackYml(outputFolderPath, {
    author: author,
    version: version,
    description: description,
    namespace: namespace
  })
}

main()
