const fs = require('fs')
const path = require('path')
const { readYaml, writeYaml } = require('../yamlHelper')
const { log } = require('../logger')

/**
 * Logger for Nexo item conversion
 */
function loggerNexo(level, message) {
  log(message, level, 'nexoitems')
}

function loggerDuplicates(level, message) {
  log(message, level, 'nexoduplicates')
}

function loggerSameIds(level, message) {
  log(message, level, 'nexosameids')
}

/**
 * Convert Nexo item data to CraftEngine format
 * Supports 3D and 2D items
 */
function convertNexoToCraft(itemData, namespace, cmdTracker = {}, cmdConflicts = {}) {
  const craftItems = { items: {} }

  for (const key in itemData) {
    const item = itemData[key]
    const pack = item.Pack || {}
    const material = item.material.toUpperCase()
    const cmd = pack.custom_model_data

    // Track CMD for material
    if (!cmdTracker[material]) cmdTracker[material] = []
    if (cmd) cmdTracker[material].push(cmd)

    // Track CMD conflicts
    if (cmd) {
      if (!cmdConflicts[material]) cmdConflicts[material] = {}
      if (cmdConflicts[material][cmd]) {
        // Conflict found: same CMD already used
        loggerSameIds('warn', `Conflict detected for CMD ${cmd} on material ${material} between items '${cmdConflicts[material][cmd]}' and '${key}'`)
      } else {
        cmdConflicts[material][cmd] = key
      }
    }

    if (pack.generate_model === false) {
      // 3D item
      craftItems.items[`${namespace}:${key}`] = {
        'custom-model-data': cmd,
        material,
        data: { 'item-name': `<!i><white><i18n:item.${namespace}.${key}></white>` },
        model: { type: 'minecraft:model', path: pack.model }
      }
    } else if (pack.texture) {
      // 2D item
      craftItems.items[`${namespace}:${key}`] = {
        'custom-model-data': cmd,
        material,
        data: { 'item-name': `<!i><white><i18n:item.${namespace}.${key}></white>` },
        model: { template: `${namespace}:model/simplified_generated`, arguments: { path: pack.texture } }
      }
    }
  }

  loggerNexo('info', `Converted ${Object.keys(craftItems.items).length} items to CraftEngine format.`)
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
        loggerNexo('warn', `Skipped blacklisted folder: ${fullPath}`)
        continue
      }
      results = results.concat(getYamlFilesRecursive(fullPath, blacklist))
    } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
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

  const filePath = path.join(outputFolder, 'id-range.txt')
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8')
  loggerNexo('info', `Wrote custom model data ranges to: ${filePath}`)
}

/**
 * Convert all Nexo YAML files in inputFolder/items to CraftEngine format in outputFolder/configuration
 */
function convertAllFiles(inputFolder, outputFolder, namespace) {
  const itemsFolder = path.join(inputFolder, 'items')
  if (!fs.existsSync(itemsFolder)) {
    loggerNexo('warn', `Input items folder not found: ${itemsFolder}`)
    return
  }

  const folderBlacklist = [
    'nexo_defaults',
  ]

  const files = getYamlFilesRecursive(itemsFolder, folderBlacklist)
  loggerNexo('info', `Found ${files.length} YAML files to process.`)

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

  // Track first item for fallback main category icon
  let mainCategoryIconSet = false

  files.forEach(file => {
    try {
      // Maintain subfolder structure in output
      const relativePath = path.relative(itemsFolder, file)
      const outputPath = path.join(outputFolder, 'configuration', 'items', relativePath)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })

      const nexoData = readYaml(file)
      if (!nexoData) {
        loggerNexo('warn', `Failed to read YAML: ${file}`)
        return
      }

      // Filter out duplicated items
      const filteredData = {}
      for (const key in nexoData) {
        const itemKey = `${namespace}:${key}`
        if (existingItems.has(itemKey)) {
          loggerDuplicates('warn', `Skipped duplicate item '${itemKey}' in file ${file}`)
          continue
        }
        filteredData[key] = nexoData[key]
        existingItems.add(itemKey)
      }

      if (Object.keys(filteredData).length === 0) {
        loggerDuplicates('warn', `All items in ${file} are duplicates, skipping file.`)
        return
      }

      // Convert items (3D + 2D)
      const craftData = convertNexoToCraft(filteredData, namespace, cmdTracker, cmdConflicts)
      writeYaml(outputPath, craftData)
      loggerNexo('info', `Wrote CraftEngine items to: ${outputPath}`)

      // Generate i18n entries for items
      for (const key in filteredData) {
        const name = filteredData[key].itemname || key
        allI18n.en[`item.${namespace}.${key}`] = name
      }

      // Create subcategory per file with checker
      const subCategoryName = path.parse(relativePath).name
      const subCategoryKey = `${namespace}:${subCategoryName}`

      const itemKeys = Object.keys(filteredData)
        .map(k => `${namespace}:${k}`)
        .filter(k => craftData.items[k]) // only include converted items

      if (itemKeys.length === 0) {
        loggerNexo('warn', `Skipping empty subcategory: ${subCategoryKey}`)
        return
      }

      categories[subCategoryKey] = {
        name: `<!i><green><i18n:category.${namespace}.${subCategoryName}></green>`,
        hidden: true,
        icon: itemKeys[0] || '',
        list: itemKeys
      }

      // Subcategory i18n
      allI18n.en[`category.${namespace}.${subCategoryName}`] = subCategoryName

      // Add subcategory reference to main category only if it has items
      categories[mainCategoryKey].list.push(`#${subCategoryKey}`)

      // Set main category icon fallback if not set yet
      if (!mainCategoryIconSet && itemKeys.length > 0) {
        const logoItem = itemKeys.find(k => k.toLowerCase().includes('logo'))
        categories[mainCategoryKey].icon = logoItem || itemKeys[0]
        mainCategoryIconSet = true
      }

      loggerNexo('info', `Created subcategory: ${subCategoryKey} with ${itemKeys.length} items`)
    } catch (error) {
      loggerNexo('error', `Error processing file ${file}: ${error.message}`)
    }
  })

  const configurationFolder = path.join(outputFolder, 'configuration')

  // Write i18n.yml
  writeYaml(path.join(configurationFolder, 'i18n.yml'), { i18n: allI18n })
  loggerNexo('info', 'Wrote i18n.yml')

  // Write categories.yml
  writeYaml(path.join(configurationFolder, 'categories.yml'), { categories })
  loggerNexo('info', 'Wrote categories.yml')

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
  loggerNexo('info', 'Wrote templates.yml')
  writeCmdRanges(outputFolder, cmdTracker)
}

module.exports = { convertNexoToCraft, convertAllFiles }
