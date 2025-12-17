const fs = require('fs')
const path = require('path')
const { log } = require('../logger')

/**
 * Logger for Nexo assets copy
 */
function loggerNexoAssets(level, message) {
  log(message, level, 'nexoassets')
}

/**
 * Recursively copy a folder and its contents
 */
function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    loggerNexoAssets('warn', `Source folder not found: ${src}`)
    return
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })
  fs.mkdirSync(dest, { recursive: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath)
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath)
      loggerNexoAssets('info', `Copied file: ${srcPath} -> ${destPath}`)
    }
  }
}

/**
 * Handle Nexo pack folder
 * Copies input/pack/assets -> output/resourcepack/assets
 * @param {string} inputFolder - Root input folder
 * @param {string} outputFolder - Root output folder
 */
function convertAssets(inputFolder, outputFolder) {
  const srcFolder = path.join(inputFolder, 'pack', 'assets')
  const destFolder = path.join(outputFolder, 'resourcepack', 'assets')

  copyFolderRecursive(srcFolder, destFolder)
  loggerNexoAssets('info', `Pack assets copied to: ${destFolder}`)
}

module.exports = { convertAssets }
