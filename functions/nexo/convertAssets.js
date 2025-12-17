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
 * Recursively copy a folder and its contents with blacklist and whitelist
 * @param {string} src - Source folder
 * @param {string} dest - Destination folder
 * @param {string[]} blacklist - Relative directory paths to skip
 * @param {string[]} whitelist - Allowed file extensions
 */
function copyFolderRecursive(src, dest, blacklist = [], whitelist = []) {
  if (!fs.existsSync(src)) {
    loggerNexoAssets('warn', `Source folder not found: ${src}`)
    return
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })
  fs.mkdirSync(dest, { recursive: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    // Check blacklist for directories
    const relativeSrc = path.relative(src.split(path.sep).slice(0, -1).join(path.sep), srcPath).replace(/\\/g, '/')
    if (blacklist.some(bl => relativeSrc.startsWith(bl))) {
      loggerNexoAssets('warn', `Skipped blacklisted path: ${srcPath}`)
      continue
    }

    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath, blacklist, whitelist)
    } else if (entry.isFile()) {
      // Check whitelist for file extensions
      const ext = path.extname(entry.name).toLowerCase()
      if (!whitelist.includes(ext)) {
        loggerNexoAssets('warn', `Skipped non-whitelisted file: ${srcPath}`)
        continue
      }

      fs.copyFileSync(srcPath, destPath)
      loggerNexoAssets('info', `Copied file: ${srcPath} -> ${destPath}`)
    }
  }
}

/**
 * Generate atlas JSON for all folders under "pack/assets/minecraft/textures"
 * @param {string} outputFolder - Root output folder
 */
function generateTextureAtlas(outputFolder) {
  const texturesFolder = path.join(outputFolder, 'resourcepack', 'assets', 'minecraft', 'textures')
  const atlasFolder = path.join(outputFolder, 'resourcepack', 'assets', 'minecraft', 'atlases')
  const atlasFile = path.join(atlasFolder, 'blocks.json')

  if (!fs.existsSync(texturesFolder)) {
    loggerNexoAssets('warn', `Textures folder not found: ${texturesFolder}`)
    return
  }

  fs.mkdirSync(atlasFolder, { recursive: true })

  const subfolders = fs.readdirSync(texturesFolder, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  const sources = subfolders.map(name => ({
    type: 'directory',
    source: name,
    prefix: `${name}/`
  }))

  const atlasData = { sources }

  fs.writeFileSync(atlasFile, JSON.stringify(atlasData, null, 4), 'utf8')
  loggerNexoAssets('info', `Generated texture atlas at: ${atlasFile}`)
}

/**
 * Handle Nexo pack assets
 * Copies input/pack/assets -> output/resourcepack/assets
 * Skips blacklisted paths and only allows whitelisted file types
 * Generates texture atlas JSON
 * @param {string} inputFolder - Root input folder
 * @param {string} outputFolder - Root output folder
 */
function convertAssets(inputFolder, outputFolder) {
  const srcFolder = path.join(inputFolder, 'pack', 'assets')
  const destFolder = path.join(outputFolder, 'resourcepack', 'assets')

  // Define blacklist and whitelist here
  const blacklist = [
    'minecraft/font',
    'modelengine',
    'optifine',
    'shaders',
  ]

  const whitelist = [
    '.png',
    '.json',
    '.mcmeta',
    '.ogg',
    '.lang',
    '.ttf',
  ]

  copyFolderRecursive(srcFolder, destFolder, blacklist, whitelist)
  loggerNexoAssets('info', `Pack assets copied to: ${destFolder}`)
  generateTextureAtlas(outputFolder)
}

module.exports = { convertAssets, generateTextureAtlas }
