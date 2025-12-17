const fs = require('fs')
const path = require('path')
const { readYaml, writeYaml } = require('./yamlHelper')

/**
 * Convert Nexo item data to CraftEngine format
 * Supports 3D and 2D items
 */
function convertNexoToCraft(itemData, namespace) {
  const craftItems = { items: {} }

  for (const key in itemData) {
    const item = itemData[key]
    const pack = item.Pack || {}

    if (pack.generate_model === false) {
      // 3D item
      craftItems.items[`${namespace}:${key}`] = {
        'custom-model-data': pack.custom_model_data,
        material: item.material,
        data: {
          'item-name': `<!i><white><i18n:item.${namespace}.${key}></white>`
        },
        model: {
          type: 'minecraft:model',
          path: pack.model
        }
      }
    } else if (pack.texture) {
      // 2D item
      craftItems.items[`${namespace}:${key}`] = {
        'custom-model-data': pack.custom_model_data,
        material: item.material,
        data: {
          'item-name': `<!i><white><i18n:item.${namespace}.${key}></white>`
        },
        model: {
          template: `${namespace}:model/simplified_generated`,
          arguments: {
            path: pack.texture
          }
        }
      }
    }
  }

  return craftItems
}

/**
 * Convert all Nexo YAML files in inputFolder to CraftEngine format in outputFolder
 */
function convertAllFiles(inputFolder, outputFolder, namespace) {
  const files = fs.readdirSync(inputFolder).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))

  const allI18n = { en: {} }
  const categories = {}

  // Main namespace category
  const mainCategoryKey = `${namespace}:${namespace}`
  categories[mainCategoryKey] = {
    priority: 1,
    name: `<!i><white><i18n:category.${namespace}.name></white>`,
    lore: [`<!i><gray><i18n:category.${namespace}.lore>`],
    icon: '',
    list: []
  }

  // Main category i18n
  allI18n.en[`category.${namespace}.name`] = namespace
  allI18n.en[`category.${namespace}.lore`] = `${namespace} Items`

  // Ensure output/items folder exists
  const outputItemsFolder = path.join(outputFolder, 'items')
  if (!fs.existsSync(outputItemsFolder)) fs.mkdirSync(outputItemsFolder, { recursive: true })

  // Track first item for fallback main category icon
  let mainCategoryIconSet = false

  files.forEach(file => {
    const inputPath = path.join(inputFolder, file)
    const outputPath = path.join(outputItemsFolder, file)

    const nexoData = readYaml(inputPath)
    if (!nexoData) return

    // 1️⃣ Convert items (3D + 2D)
    const craftData = convertNexoToCraft(nexoData, namespace)
    writeYaml(outputPath, craftData)

    // 2️⃣ Generate i18n entries for items
    for (const key in nexoData) {
      const name = nexoData[key].itemname || key
      allI18n.en[`item.${namespace}.${key}`] = name
    }

    // 3️⃣ Create subcategory per file
    const subCategoryKey = `${namespace}:${path.parse(file).name}`
    const itemKeys = Object.keys(nexoData).map(k => `${namespace}:${k}`)

    categories[subCategoryKey] = {
      name: `<!i><green><i18n:category.${namespace}.${path.parse(file).name}></green>`,
      hidden: true,
      icon: itemKeys[0] || '',
      list: itemKeys
    }

    // Subcategory i18n
    allI18n.en[`category.${namespace}.${path.parse(file).name}`] = path.parse(file).name

    // Add subcategory reference to main category
    categories[mainCategoryKey].list.push(`#${subCategoryKey}`)

    // Set main category icon fallback if not set yet
    if (!mainCategoryIconSet && itemKeys.length > 0) {
      categories[mainCategoryKey].icon = itemKeys[0]
      mainCategoryIconSet = true
    }
  })

  // Write i18n.yml
  writeYaml(path.join(outputFolder, 'i18n.yml'), { i18n: allI18n })

  // Write categories.yml
  writeYaml(path.join(outputFolder, 'categories.yml'), { categories })

  // Write templates.yml (always, using namespace)
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

  writeYaml(path.join(outputFolder, 'templates.yml'), templates)
}

module.exports = { convertNexoToCraft, convertAllFiles }
