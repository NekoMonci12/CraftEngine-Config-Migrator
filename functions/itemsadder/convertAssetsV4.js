const fs = require('fs')
const path = require('path')
const { log } = require('../logger')

/**
 * Logger for ItemsAdder v4 assets copy
 */
function loggerItemsAdderV4Assets(level, message) {
  log(message, level, 'itemsadderv4assets')
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
    loggerItemsAdderV4Assets('warn', `Source folder not found: ${src}`)
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
      loggerItemsAdderV4Assets('warn', `Skipped blacklisted path: ${srcPath}`)
      continue
    }

    // Skip desktop.ini files and pack.mcmeta
    if (entry.name === 'desktop.ini' || entry.name === 'pack.mcmeta') {
      continue
    }

    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath, blacklist, whitelist)
    } else if (entry.isFile()) {
      // Check whitelist for file extensions
      const ext = path.extname(entry.name).toLowerCase()
      if (!whitelist.includes(ext)) {
        loggerItemsAdderV4Assets('warn', `Skipped non-whitelisted file: ${srcPath}`)
        continue
      }

      fs.copyFileSync(srcPath, destPath)
      loggerItemsAdderV4Assets('info', `Copied file: ${srcPath} -> ${destPath}`)
    }
  }
}

/**
 * Generate atlas JSON for all folders under "resourcepack/assets/minecraft/textures"
 * @param {string} outputFolder - Root output folder
 */
function generateTextureAtlas(outputFolder) {
  const texturesFolder = path.join(outputFolder, 'resourcepack', 'assets', 'minecraft', 'textures')
  const atlasFolder = path.join(outputFolder, 'resourcepack', 'assets', 'minecraft', 'atlases')
  const atlasFile = path.join(atlasFolder, 'blocks.json')

  if (!fs.existsSync(texturesFolder)) {
    loggerItemsAdderV4Assets('warn', `Textures folder not found: ${texturesFolder}`)
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
  loggerItemsAdderV4Assets('info', `Generated texture atlas at: ${atlasFile}`)
}

/**
 * Handle ItemsAdder v4 resource pack assets
 * Copies pack_name/resourcepack/assets -> output/resourcepack/assets
 * Merges all pack assets into one output
 * @param {string} inputFolder - Root input folder
 * @param {string} outputFolder - Root output folder
 */
function convertAssets(inputFolder, outputFolder) {
  const contentsFolder = path.join(inputFolder, 'contents')
  if (!fs.existsSync(contentsFolder)) {
    loggerItemsAdderV4Assets('warn', `Input contents folder not found: ${contentsFolder}`)
    return
  }

  const destFolder = path.join(outputFolder, 'resourcepack', 'assets')

  // Define blacklist and whitelist
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

  // Get all pack folders (exclude _iainternal and folders starting with _)
  const packFolders = fs.readdirSync(contentsFolder, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => path.join(contentsFolder, d.name))

  loggerItemsAdderV4Assets('info', `Found ${packFolders.length} packs to process for assets.`)

  // Merged sounds object for combining all sounds.json files
  const mergedSounds = {}

  // Copy assets from each pack
  packFolders.forEach(packFolder => {
    const packName = path.basename(packFolder)
    const resourcepackFolder = path.join(packFolder, 'resourcepack', 'assets')

    if (!fs.existsSync(resourcepackFolder)) {
      loggerItemsAdderV4Assets('warn', `No resourcepack/assets in pack: ${packName}`)
      return
    }

    loggerItemsAdderV4Assets('info', `Processing assets from pack: ${packName}`)
    
    // Get all namespace folders in this pack's assets
    const namespaceFolders = fs.readdirSync(resourcepackFolder, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    namespaceFolders.forEach(namespace => {
      const namespaceFolder = path.join(resourcepackFolder, namespace)
      const modelsFolder = path.join(namespaceFolder, 'models')
      const texturesFolder = path.join(namespaceFolder, 'textures')
      const soundsFolder = path.join(namespaceFolder, 'sounds')

      // Copy models to minecraft namespace
      if (fs.existsSync(modelsFolder)) {
        const minecraftModelsFolder = path.join(destFolder, 'minecraft', 'models')
        copyFolderRecursive(modelsFolder, minecraftModelsFolder, blacklist, whitelist)
        loggerItemsAdderV4Assets('info', `Copied models from ${namespace} to minecraft namespace`)
      }

      // Copy textures to minecraft namespace
      if (fs.existsSync(texturesFolder)) {
        const minecraftTexturesFolder = path.join(destFolder, 'minecraft', 'textures')
        copyFolderRecursive(texturesFolder, minecraftTexturesFolder, blacklist, whitelist)
        loggerItemsAdderV4Assets('info', `Copied textures from ${namespace} to minecraft namespace`)
      }

      // Copy sounds to minecraft namespace
      if (fs.existsSync(soundsFolder)) {
        const minecraftSoundsFolder = path.join(destFolder, 'minecraft', 'sounds')
        copyFolderRecursive(soundsFolder, minecraftSoundsFolder, blacklist, whitelist)
        loggerItemsAdderV4Assets('info', `Copied sounds from ${namespace} to minecraft namespace`)
      }

      // Copy any other folders (optifine, font, etc.) to original namespace
      const otherEntries = fs.readdirSync(namespaceFolder, { withFileTypes: true })
        .filter(d => d.isDirectory() && !['models', 'textures', 'sounds'].includes(d.name))
      
      otherEntries.forEach(entry => {
        const srcPath = path.join(namespaceFolder, entry.name)
        const destPath = path.join(destFolder, namespace, entry.name)
        copyFolderRecursive(srcPath, destPath, blacklist, whitelist)
      })

      // Copy any root files (like sounds.json)
      const rootFiles = fs.readdirSync(namespaceFolder, { withFileTypes: true })
        .filter(f => f.isFile())
      
      rootFiles.forEach(file => {
        const ext = path.extname(file.name).toLowerCase()
        if (whitelist.includes(ext)) {
          const srcPath = path.join(namespaceFolder, file.name)
          
          // Special handling for sounds.json - modify namespace references to minecraft
          if (file.name === 'sounds.json') {
            try {
              const soundsData = JSON.parse(fs.readFileSync(srcPath, 'utf8'))
              
              // Replace all namespace references in sound paths with minecraft:
              for (const soundKey in soundsData) {
                if (soundsData[soundKey].sounds && Array.isArray(soundsData[soundKey].sounds)) {
                  soundsData[soundKey].sounds = soundsData[soundKey].sounds.map(soundPath => {
                    if (typeof soundPath === 'string') {
                      // Replace "namespace:path" with "minecraft:path"
                      return soundPath.replace(/^[^:]+:/, 'minecraft:')
                    }
                    return soundPath
                  })
                }
                
                // Merge into the accumulated sounds object
                mergedSounds[soundKey] = soundsData[soundKey]
              }
              
              loggerItemsAdderV4Assets('info', `Processed sounds.json from ${namespace} (${Object.keys(soundsData).length} sounds)`)
            } catch (error) {
              loggerItemsAdderV4Assets('error', `Failed to process sounds.json from ${namespace}: ${error.message}`)
            }
          } else {
            // Copy other files to original namespace
            const destPath = path.join(destFolder, namespace, file.name)
            fs.mkdirSync(path.dirname(destPath), { recursive: true })
            fs.copyFileSync(srcPath, destPath)
            loggerItemsAdderV4Assets('info', `Copied file: ${srcPath} -> ${destPath}`)
          }
        }
      })
    })
  })

  loggerItemsAdderV4Assets('info', `Resource pack assets copied to: ${destFolder}`)
  // Write merged sounds.json to minecraft namespace
  if (Object.keys(mergedSounds).length > 0) {
    const soundsPath = path.join(destFolder, 'minecraft', 'sounds.json')
    fs.mkdirSync(path.dirname(soundsPath), { recursive: true })
    fs.writeFileSync(soundsPath, JSON.stringify(mergedSounds, null, 2), 'utf8')
    loggerItemsAdderV4Assets('info', `Wrote merged sounds.json with ${Object.keys(mergedSounds).length} total sounds to minecraft namespace`)
  }

  generateTextureAtlas(outputFolder)
}

module.exports = { convertAssets, generateTextureAtlas }
