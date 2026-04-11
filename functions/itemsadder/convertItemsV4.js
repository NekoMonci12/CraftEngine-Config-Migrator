const fs = require('fs')
const path = require('path')
const { readYaml, writeYaml } = require('../yamlHelper')
const { log } = require('../logger')

/**
 * Logger for ItemsAdder v4 item conversion
 */
function loggerItemsAdderV4(level, message) {
  log(message, level, 'itemsadderv4items')
}

function loggerDuplicates(level, message) {
  log(message, level, 'itemsadderv4duplicates')
}

function loggerSameIds(level, message) {
  log(message, level, 'itemsadderv4sameids')
}

/**
 * Resolve the namespace root folder for a v4 pack.
 * Supports both resourcepack/assets/<namespace>/... and resourcepack/<namespace>/...
 * @param {string} packFolder - Absolute path to the pack folder inside contents
 * @returns {string|null} Namespace root folder path or null if not found
 */
function getNamespaceRootFolder(packFolder) {
  const assetsFolder = path.join(packFolder, 'resourcepack', 'assets')
  if (fs.existsSync(assetsFolder)) {
    return assetsFolder
  }

  const resourcepackFolder = path.join(packFolder, 'resourcepack')
  if (fs.existsSync(resourcepackFolder)) {
    return resourcepackFolder
  }

  return null
}

/**
 * Load cached IDs from storage/items_ids_cache.yml
 * @param {string} inputFolder - Root input folder
 * @returns {Object} Cache object with structure: { MATERIAL: { 'namespace:item': cmd } }
 */
function loadCachedIds(inputFolder) {
  const cachePath = path.join(inputFolder, 'storage', 'items_ids_cache.yml')
  if (!fs.existsSync(cachePath)) {
    loggerItemsAdderV4('warn', `Cache file not found: ${cachePath}`)
    return {}
  }

  const cache = readYaml(cachePath)
  if (!cache) {
    loggerItemsAdderV4('warn', `Failed to read cache file: ${cachePath}`)
    return {}
  }

  loggerItemsAdderV4('info', `Loaded cached IDs from: ${cachePath}`)
  return cache
}

/**
 * Get custom model data for an item
 * @param {string} namespace - Item namespace
 * @param {string} itemKey - Item key
 * @param {string} material - Material type
 * @param {number|undefined} explicitModelId - Explicitly defined model_id
 * @param {Object} cache - Cached IDs
 * @param {Object} generatedIds - Generated IDs tracker
 * @returns {number|undefined} Custom model data
 */
function getCustomModelData(namespace, itemKey, material, explicitModelId, cache, generatedIds) {
  // 1. Use explicit model_id if provided
  if (explicitModelId !== undefined && explicitModelId !== null) {
    return explicitModelId
  }

  // 2. Try to get from cache
  const itemFullKey = `${namespace}:${itemKey}`
  if (cache[material] && cache[material][itemFullKey] !== undefined) {
    const cachedId = cache[material][itemFullKey]
    loggerItemsAdderV4('info', `Using cached ID ${cachedId} for ${itemFullKey} (${material})`)
    return cachedId
  }

  // 3. Generate new ID
  if (!generatedIds[material]) {
    generatedIds[material] = 10000 // Start from 10000 for generated IDs
  }
  
  const newId = generatedIds[material]++
  loggerItemsAdderV4('warn', `Generated new ID ${newId} for ${itemFullKey} (${material})`)
  return newId
}

/**
 * Convert ItemsAdder v4 item data to CraftEngine format
 * Supports 3D items with model_path, 2D items with textures, and custom armor
 */
function convertItemsAdderToCraft(itemData, namespace, cmdTracker = {}, cmdConflicts = {}, cache = {}, generatedIds = {}, knownNamespaces = new Set()) {
  const craftItems = { items: {} }

  for (const key in itemData) {
    const item = itemData[key]
    const resource = item.resource || {}
    const specificProps = item.specific_properties || {}
    const material = resource.material ? resource.material.toUpperCase() : 'PAPER'
    const modelPath = resource.model_path
    const textures = resource.textures
    const generate = resource.generate !== false
    const explicitModelId = resource.model_id

    const sanitizePath = (path) => path ? path.replace(/\.[^/.]+$/, "") : path
    const withNamespaceFallback = (value, defaultNamespace) => {
      const cleanPath = sanitizePath(value)
      if (!cleanPath) return cleanPath
      if (cleanPath.includes(':')) return cleanPath
      const slashIndex = cleanPath.indexOf('/')
      if (slashIndex > 0) {
        const candidateNamespace = cleanPath.substring(0, slashIndex)
        if (knownNamespaces.has(candidateNamespace)) {
          // Keep the full path including the namespace folder
          return `${candidateNamespace}:${cleanPath}`
        }
      }
      return defaultNamespace ? `${defaultNamespace}:${cleanPath}` : `minecraft:${cleanPath}`
    }

    // Temporarily exclude custom armor items from conversion.
    if (specificProps.armor) {
      loggerItemsAdderV4('info', `Skipping armor item '${namespace}:${key}'`)
      continue
    }

    // Get custom model data (from explicit, cache, or generate)
    const cmd = getCustomModelData(namespace, key, material, explicitModelId, cache, generatedIds)

    // Track CMD for material
    if (cmd !== undefined) {
      if (!cmdTracker[material]) cmdTracker[material] = []
      cmdTracker[material].push(cmd)

      // Track CMD conflicts
      if (!cmdConflicts[material]) cmdConflicts[material] = {}
      if (cmdConflicts[material][cmd]) {
        loggerSameIds('warn', `Conflict detected for CMD ${cmd} on material ${material} between items '${cmdConflicts[material][cmd]}' and '${key}'`)
      } else {
        cmdConflicts[material][cmd] = key
      }
    }

    // Strip Minecraft color codes from display name
    const displayName = item.display_name ? item.display_name.replace(/§[0-9a-fk-or]/gi, '') : key

    const craftItem = {
      material,
      data: { 'item-name': `<!i><white><i18n:item.${namespace}.${key}></white>` }
    }

    // Add custom-model-data if available
    if (cmd !== undefined) {
      craftItem['custom-model-data'] = cmd
    }

    // Handle 3D items with model_path
    if (modelPath && !generate) {
      craftItem.model = { type: 'minecraft:model', path: withNamespaceFallback(modelPath, namespace) }
      craftItems.items[`${namespace}:${key}`] = craftItem
    }
    // Handle 2D items with textures (generated)
    else if (textures && textures.length > 0 && generate) {
      const texturePath = sanitizePath(textures[0])
      craftItem.model = { 
        template: `${namespace}:model/simplified_generated`, 
        arguments: { path: withNamespaceFallback(texturePath, namespace) } 
      }
      craftItems.items[`${namespace}:${key}`] = craftItem
    }
    // Handle items with model_path but generate=true
    else if (modelPath) {
      craftItem.model = { type: 'minecraft:model', path: withNamespaceFallback(modelPath, namespace) }
      craftItems.items[`${namespace}:${key}`] = craftItem
    }
    else {
      loggerItemsAdderV4('warn', `Item '${key}' has no model_path or textures, skipping`)
    }
  }

  loggerItemsAdderV4('info', `Converted ${Object.keys(craftItems.items).length} items to CraftEngine format.`)
  return craftItems
}

/**
 * Recursively find all .yml/.yaml files in a folder
 */
function getYamlFilesRecursive(folder, blacklist = []) {
  let results = []
  if (!fs.existsSync(folder)) return results

  const entries = fs.readdirSync(folder, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name)
    if (entry.isDirectory()) {
      if (blacklist.includes(entry.name)) {
        loggerItemsAdderV4('warn', `Skipped blacklisted folder: ${fullPath}`)
        continue
      }
      results = results.concat(getYamlFilesRecursive(fullPath, blacklist))
    } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
      // Skip category files
      if (entry.name.includes('categories') || entry.name.includes('category')) {
        loggerItemsAdderV4('info', `Skipped category file: ${fullPath}`)
        continue
      }
      results.push(fullPath)
    }
  }
  return results
}

/**
 * Write CMD ranges to id-range.txt
 */
function writeCmdRanges(outputFolder, cmdTracker) {
  const lines = []

  for (const material in cmdTracker) {
    const ids = cmdTracker[material].sort((a, b) => a - b)
    if (!ids.length) continue

    let rangeStart = ids[0]
    let rangeEnd = ids[0]

    const ranges = []

    for (let i = 1; i < ids.length; i++) {
      if (ids[i] === rangeEnd + 1) {
        rangeEnd = ids[i]
      } else {
        ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`)
        rangeStart = rangeEnd = ids[i]
      }
    }
    ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`)

    lines.push(`${material}: ${ranges.join(', ')}`)
  }

  if (lines.length > 0) {
    const filePath = path.join(outputFolder, 'id-range.txt')
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8')
    loggerItemsAdderV4('info', `Wrote custom model data ranges to: ${filePath}`)
  }
}

/**
 * Convert all ItemsAdder v4 YAML files in inputFolder/contents to CraftEngine format
 */
function convertAllFiles(inputFolder, outputFolder, namespace) {
  const contentsFolder = path.join(inputFolder, 'contents')
  if (!fs.existsSync(contentsFolder)) {
    loggerItemsAdderV4('warn', `Input contents folder not found: ${contentsFolder}`)
    return
  }

  // Load cached IDs
  const cachedIds = loadCachedIds(inputFolder)
  const generatedIds = {}

  // Collect all known resource namespaces from contents/*/resourcepack/assets/*.
  const knownNamespaces = new Set()
  const namespacePackFolders = fs.readdirSync(contentsFolder, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
  namespacePackFolders.forEach(pack => {
    const packFolder = path.join(contentsFolder, pack.name)
    const namespaceRootFolder = getNamespaceRootFolder(packFolder)
    if (!namespaceRootFolder) return
    fs.readdirSync(namespaceRootFolder, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .forEach(d => knownNamespaces.add(d.name))
  })

  const allI18n = { en: {} }
  const categories = {}
  const cmdTracker = {}
  const cmdConflicts = {}
  const existingItems = new Set()

  // Main namespace category
  const mainCategoryKey = `${namespace}:${namespace}`
  categories[mainCategoryKey] = {
    priority: 1,
    name: `<!i><white><i18n:category.${namespace}.name></white>`,
    lore: [`<!i><gray><i18n:category.${namespace}.lore>`],
    icon: '',
    list: []
  }

  allI18n.en[`category.${namespace}.name`] = namespace
  allI18n.en[`category.${namespace}.lore`] = `${namespace} Items`

  let mainCategoryLogoCandidate = ''

  // Get all pack folders in contents (exclude _iainternal and folders starting with _)
  const packFolders = fs.readdirSync(contentsFolder, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => path.join(contentsFolder, d.name))

  loggerItemsAdderV4('info', `Found ${packFolders.length} pack folders to process.`)

  packFolders.forEach(packFolder => {
    const packName = path.basename(packFolder)
    const configsFolder = path.join(packFolder, 'configs')

    if (!fs.existsSync(configsFolder)) {
      loggerItemsAdderV4('warn', `No configs folder in pack: ${packFolder}`)
      return
    }

    // Get all YAML files in the pack's configs folder
    const files = getYamlFilesRecursive(configsFolder)
    if (files.length === 0) {
      loggerItemsAdderV4('warn', `No item files found in: ${configsFolder}`)
      return
    }

    loggerItemsAdderV4('info', `Processing ${files.length} files in pack: ${packName}`)

    // Collect all items from all files in this pack
    const packItems = {}
    let packNamespace = namespace

    files.forEach(file => {
      try {
        const data = readYaml(file)
        if (!data) {
          loggerItemsAdderV4('warn', `Failed to read YAML: ${file}`)
          return
        }

        // Get namespace from info section
        if (data.info && data.info.namespace) {
          packNamespace = data.info.namespace
        }

        // Collect items
        if (data.items) {
          Object.assign(packItems, data.items)
        }
      } catch (error) {
        loggerItemsAdderV4('error', `Error reading file ${file}: ${error.message}`)
      }
    })

    if (Object.keys(packItems).length === 0) {
      loggerItemsAdderV4('warn', `No items found in pack: ${packName}`)
      return
    }

    // Filter out duplicates
    const filteredData = {}
    for (const key in packItems) {
      const itemKey = `${packNamespace}:${key}`
      if (existingItems.has(itemKey)) {
        loggerDuplicates('warn', `Skipped duplicate item '${itemKey}' in pack ${packName}`)
        continue
      }
      filteredData[key] = packItems[key]
      existingItems.add(itemKey)
    }

    if (Object.keys(filteredData).length === 0) {
      loggerDuplicates('warn', `All items in ${packName} are duplicates, skipping pack.`)
      return
    }

    // Convert items
    const outputPath = path.join(outputFolder, 'configuration', 'items', packNamespace, `${packName}.yml`)
    const craftData = convertItemsAdderToCraft(filteredData, packNamespace, cmdTracker, cmdConflicts, cachedIds, generatedIds, knownNamespaces)
    writeYaml(outputPath, craftData)
    loggerItemsAdderV4('info', `Wrote CraftEngine items to: ${outputPath}`)

    // Generate i18n entries for items
    for (const key in filteredData) {
      const displayName = filteredData[key].display_name ? filteredData[key].display_name.replace(/§[0-9a-fk-or]/gi, '') : key
      allI18n.en[`item.${packNamespace}.${key}`] = displayName
    }

    // Create subcategory per pack
    const subCategoryKey = `${packNamespace}:${packName}`
    const itemKeys = Object.keys(filteredData)
      .map(k => `${packNamespace}:${k}`)
      .filter(k => craftData.items[k])

    if (itemKeys.length === 0) {
      loggerItemsAdderV4('warn', `Skipping empty subcategory: ${subCategoryKey}`)
      return
    }

    categories[subCategoryKey] = {
      name: `<!i><green><i18n:category.${packNamespace}.${packName}></green>`,
      hidden: true,
      icon: itemKeys[0] || '',
      list: itemKeys
    }

    // Subcategory i18n
    allI18n.en[`category.${packNamespace}.${packName}`] = packName

    // Add subcategory reference to main category
    categories[mainCategoryKey].list.push(`#${subCategoryKey}`)

    // Track a logo item for main category icon
    if (!mainCategoryLogoCandidate && itemKeys.length > 0) {
      const logoItem = itemKeys.find(k => k.toLowerCase().includes('logo') || k.toLowerCase().includes('sword'))
      if (logoItem) mainCategoryLogoCandidate = logoItem
    }

    loggerItemsAdderV4('info', `Created subcategory: ${subCategoryKey} with ${itemKeys.length} items`)
  })

  categories[mainCategoryKey].icon = mainCategoryLogoCandidate || categories[mainCategoryKey].list[0] || ''

  const configurationFolder = path.join(outputFolder, 'configuration')

  // Write i18n.yml
  writeYaml(path.join(configurationFolder, 'i18n.yml'), { i18n: allI18n })
  loggerItemsAdderV4('info', 'Wrote i18n.yml')

  // Write categories.yml
  writeYaml(path.join(configurationFolder, 'categories.yml'), { categories })
  loggerItemsAdderV4('info', 'Wrote categories.yml')

  // Write templates.yml
  const templates = {
    'templates#models#2d': {
      [`${namespace}:model/generated`]: {
        type: 'minecraft:model',
        path: '${model}',
        generation: {
          parent: 'minecraft:item/generated',
          textures: { layer0: '${texture}' }
        }
      },
      [`${namespace}:model/simplified_generated`]: {
        type: 'minecraft:model',
        path: '${path}',
        generation: {
          parent: 'minecraft:item/generated',
          textures: { layer0: '${path}' }
        }
      }
    }
  }

  writeYaml(path.join(configurationFolder, 'templates.yml'), templates)
  loggerItemsAdderV4('info', 'Wrote templates.yml')
  writeCmdRanges(outputFolder, cmdTracker)
}

module.exports = { convertItemsAdderToCraft, convertAllFiles }
