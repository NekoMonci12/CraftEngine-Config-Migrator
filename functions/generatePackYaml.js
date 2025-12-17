const fs = require('fs')
const path = require('path')
const { log } = require('./logger')

/**
 * Logger for pack.yml generation
 */
function loggerPack(level, message) {
  log(message, level, 'convertpack')
}

/**
 * Generate pack.yml for Craft Engine
 * @param {string} outputFolder - Root output folder (where configuration/ and resourcepack/ exist)
 * @param {object} options - Pack options: author, version, description, namespace
 */
function generatePackYml(outputFolder, options = {}) {
  const {
    author = 'Unknown',
    version = '0.0.1',
    description = 'Craft Engine Pack',
    namespace = 'default'
  } = options

  const packData = {
    author,
    version,
    description,
    namespace
  }

  const packPath = path.join(outputFolder, 'pack.yml')

  try {
    fs.writeFileSync(packPath, yamlStringify(packData), 'utf8')
    loggerPack('info', `Generated pack.yml at: ${packPath}`)
  } catch (err) {
    loggerPack('error', `Failed to generate pack.yml: ${err.message}`)
  }
}

/**
 * Simple YAML serializer
 * @param {object} obj
 * @returns {string}
 */
function yamlStringify(obj) {
  const lines = []
  for (const key in obj) {
    lines.push(`${key}: ${obj[key]}`)
  }
  return lines.join('\n') + '\n'
}

module.exports = { generatePackYml }
