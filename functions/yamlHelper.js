const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Reads a YAML file and converts it to a JavaScript object
 * @param {string} filePath - Path to the YAML file
 * @returns {Object|null} - Parsed YAML as JS object, or null on error
 */
function readYaml(filePath) {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    console.error(`Failed to read YAML file at ${filePath}:`, error);
    return null;
  }
}

/**
 * Writes a JavaScript object to a YAML file
 * @param {string} filePath - Path to the YAML file to write
 * @param {Object} data - JavaScript object to convert to YAML
 */
function writeYaml(filePath, data) {
  try {
    const yamlString = yaml.dump(data);
    fs.writeFileSync(filePath, yamlString, 'utf8');
    console.log(`YAML file written to ${filePath}`);
  } catch (error) {
    console.error(`Failed to write YAML file at ${filePath}:`, error);
  }
}

module.exports = {
  readYaml,
  writeYaml
};
