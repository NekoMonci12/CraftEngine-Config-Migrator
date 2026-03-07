const fs = require('fs')
const path = require('path')
const { readYaml, writeYaml } = require('../yamlHelper')
const { log } = require('../logger')

/**
 * Logger for ItemsAdder item conversion
 */
function loggerItemsAdder(level, message) {
  log(message, level, 'itemsadderitems')
}

function loggerDuplicates(level, message) {
  log(message, level, 'itemsadderduplicates')
}

function loggerSameIds(level, message) {
  log(message, level, 'itemsaddersameids')
}

/**
 * Load cached IDs from storage/items_ids_cache.yml
 * @param {string} inputFolder - Root input folder
 * @returns {Object} Cache object with structure: { MATERIAL: { 'namespace:item': cmd } }
 */
function loadCachedIds(inputFolder) {
  const cachePath = path.join(inputFolder, 'storage', 'items_ids_cache.yml')
  if (!fs.existsSync(cachePath)) {
    loggerItemsAdder('warn', `Cache file not found: ${cachePath}`)
    return {}
  }

  const cache = readYaml(cachePath)
  if (!cache) {
    loggerItemsAdder('warn', `Failed to read cache file: ${cachePath}`)
    return {}
  }

  loggerItemsAdder('info', `Loaded cached IDs from: ${cachePath}`)
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
    loggerItemsAdder('info', `Using cached ID ${cachedId} for ${itemFullKey} (${material})`)
    return cachedId
  }

  // 3. Generate new ID
  if (!generatedIds[material]) {
    generatedIds[material] = 10000 // Start from 10000 for generated IDs
  }
  
  const newId = generatedIds[material]++
  loggerItemsAdder('warn', `Generated new ID ${newId} for ${itemFullKey} (${material})`)
  return newId
}

/**
 * Convert ItemsAdder item data to CraftEngine format
 * Supports 3D items with model_path, 2D items with textures, and custom armor
 */
function convertItemsAdderToCraft(itemData, namespace, cmdTracker = {}, cmdConflicts = {}, cache = {}, generatedIds = {}) {
  const craftItems = { items: {} }

  for (const key in itemData) {
    const item = itemData[key]
    const resource = item.resource || {}
    const behaviours = item.behaviours || {}
    const specificProps = item.specific_properties || {}
    const material = resource.material ? resource.material.toUpperCase() : 'PAPER'
    const modelPath = resource.model_path
    const textures = resource.textures
    const generate = resource.generate !== false
    const explicitModelId = resource.model_id

    const sanitizePath = (path) => path ? path.replace(/\.[^/.]+$/, "") : path

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
      craftItem.model = { type: 'minecraft:model', path: namespace + ':' + sanitizePath(modelPath) }
      craftItems.items[`${namespace}:${key}`] = craftItem
    }
    // Handle 2D items with textures (generated)
    else if (textures && textures.length > 0 && generate) {
      const texturePath = sanitizePath(textures[0])
      craftItem.model = { 
        template: `${namespace}:model/simplified_generated`, 
        arguments: { path: namespace + ':' + texturePath } 
      }
      craftItems.items[`${namespace}:${key}`] = craftItem
    }
    // Handle custom armor
    else if (specificProps.armor) {
      // Custom armor items - just mark them as armor (Craft Engine handles armor differently)
      craftItem.model = { 
        template: `${namespace}:model/simplified_generated`, 
        arguments: { path: textures && textures.length > 0 ? namespace + ':' + sanitizePath(textures[0]) : `${namespace}:${namespace}/${key}` } 
      }
      craftItems.items[`${namespace}:${key}`] = craftItem
    }
    // Handle items with model_path but generate=true
    else if (modelPath) {
      craftItem.model = { type: 'minecraft:model', path: namespace + ':' + sanitizePath(modelPath) }
      craftItems.items[`${namespace}:${key}`] = craftItem
    }
    else {
      loggerItemsAdder('warn', `Item '${key}' has no model_path or textures, skipping`)
    }
  }

  loggerItemsAdder('info', `Converted ${Object.keys(craftItems.items).length} items to CraftEngine format.`)
  return craftItems
}

/**
 * Recursively find all .yml/.yaml files in a folder, ignoring blacklisted folders
 */
function getYamlFilesRecursive(folder, blacklist = []) {
  let results = []
  const entries = fs.readdirSync(folder, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name)
    if (entry.isDirectory()) {
      if (blacklist.includes(entry.name)) {
        loggerItemsAdder('warn', `Skipped blacklisted folder: ${fullPath}`)
        continue
      }
      results = results.concat(getYamlFilesRecursive(fullPath, blacklist))
    } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
      // Skip category files
      if (entry.name.includes('categories')) {
        loggerItemsAdder('info', `Skipped category file: ${fullPath}`)
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
    loggerItemsAdder('info', `Wrote custom model data ranges to: ${filePath}`)
  }
}

/**
 * Convert all ItemsAdder YAML files in inputFolder/items_packs to CraftEngine format
 */
function convertAllFiles(inputFolder, outputFolder, namespace) {
  const itemsPacksFolder = path.join(inputFolder, 'items_packs')
  if (!fs.existsSync(itemsPacksFolder)) {
    loggerItemsAdder('warn', `Input items_packs folder not found: ${itemsPacksFolder}`)
    return
  }

  // Load cached IDs
  const cachedIds = loadCachedIds(inputFolder)
  const generatedIds = {}

  const folderBlacklist = []

  const files = getYamlFilesRecursive(itemsPacksFolder, folderBlacklist)
  loggerItemsAdder('info', `Found ${files.length} YAML files to process.`)

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

  files.forEach(file => {
    try {
      const relativePath = path.relative(itemsPacksFolder, file)
      const outputPath = path.join(outputFolder, 'configuration', 'items', relativePath)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })

      const iaData = readYaml(file)
      if (!iaData) {
        loggerItemsAdder('warn', `Failed to read YAML: ${file}`)
        return
      }

      // ItemsAdder format has info.namespace and items sections
      const fileNamespace = iaData.info?.namespace || namespace
      const itemsData = iaData.items || {}

      // Filter out duplicated items
      const filteredData = {}
      for (const key in itemsData) {
        const itemKey = `${fileNamespace}:${key}`
        if (existingItems.has(itemKey)) {
          loggerDuplicates('warn', `Skipped duplicate item '${itemKey}' in file ${file}`)
          continue
        }
        filteredData[key] = itemsData[key]
        existingItems.add(itemKey)
      }

      if (Object.keys(filteredData).length === 0) {
        loggerDuplicates('warn', `All items in ${file} are duplicates, skipping file.`)
        return
      }

      // Convert items
      const craftData = convertItemsAdderToCraft(filteredData, fileNamespace, cmdTracker, cmdConflicts, cachedIds, generatedIds)
      writeYaml(outputPath, craftData)
      loggerItemsAdder('info', `Wrote CraftEngine items to: ${outputPath}`)

      // Generate i18n entries for items
      for (const key in filteredData) {
        const name = filteredData[key].display_name || key
        allI18n.en[`item.${fileNamespace}.${key}`] = name
      }

      // Create subcategory per file
      const subCategoryName = path.parse(relativePath).name
      const subCategoryKey = `${fileNamespace}:${subCategoryName}`

      const itemKeys = Object.keys(filteredData)
        .map(k => `${fileNamespace}:${k}`)
        .filter(k => craftData.items[k])

      if (itemKeys.length === 0) {
        loggerItemsAdder('warn', `Skipping empty subcategory: ${subCategoryKey}`)
        return
      }

      categories[subCategoryKey] = {
        name: `<!i><green><i18n:category.${fileNamespace}.${subCategoryName}></green>`,
        hidden: true,
        icon: itemKeys[0] || '',
        list: itemKeys
      }

      // Subcategory i18n
      allI18n.en[`category.${fileNamespace}.${subCategoryName}`] = subCategoryName

      // Add subcategory reference to main category
      categories[mainCategoryKey].list.push(`#${subCategoryKey}`)

      // Track a logo item for main category icon
      if (!mainCategoryLogoCandidate && itemKeys.length > 0) {
        const logoItem = itemKeys.find(k => k.toLowerCase().includes('logo') || k.toLowerCase().includes('sword'))
        if (logoItem) mainCategoryLogoCandidate = logoItem
      }

      loggerItemsAdder('info', `Created subcategory: ${subCategoryKey} with ${itemKeys.length} items`)
    } catch (error) {
      loggerItemsAdder('error', `Error processing file ${file}: ${error.message}`)
    }
  })

  categories[mainCategoryKey].icon = mainCategoryLogoCandidate || categories[mainCategoryKey].list[0] || ''

  const configurationFolder = path.join(outputFolder, 'configuration')

  // Write i18n.yml
  writeYaml(path.join(configurationFolder, 'i18n.yml'), { i18n: allI18n })
  loggerItemsAdder('info', 'Wrote i18n.yml')

  // Write categories.yml
  writeYaml(path.join(configurationFolder, 'categories.yml'), { categories })
  loggerItemsAdder('info', 'Wrote categories.yml')

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
  loggerItemsAdder('info', 'Wrote templates.yml')
  writeCmdRanges(outputFolder, cmdTracker)
}

module.exports = { convertItemsAdderToCraft, convertAllFiles }
