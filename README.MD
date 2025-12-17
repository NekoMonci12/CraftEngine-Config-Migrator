# Craft Engine Config Migrator

A Node.js utility to convert **Nexo-style Minecraft item packs** into **Craft Engine** format, including automatic generation of:

- 2D/3D items in Craft Engine YAML format
- `i18n.yml` for translations
- `categories.yml` with subcategories
- `templates.yml` for 2D item models
- `pack.yml` for Craft Engine
- Resource pack assets from Nexo `pack/assets` folder

---

## Features

1. **Item Conversion**  
   Converts Nexo item YAMLs (3D or 2D) into Craft Engine structure:

   - 3D items with `generate_model: false`
   - 2D items with `texture` field
   - Automatically generates i18n entries
   - Automatically creates subcategories for each YAML file

2. **Resource Pack Assets**  
   Copies files from `input/pack/assets` to `output/resourcepack/assets`, with:

   - Blacklist for certain directories (e.g., `minecraft/font`, `shaders`)
   - Whitelist for allowed file types (`.png`, `.json`, `.mcmeta`, `.ogg`, `.lang`, `.ttf`)

3. **Pack Metadata**  
   Generates `pack.yml` in the output root with customizable:

   - `author`
   - `version`
   - `description`
   - `namespace`

4. **Logging**  
   Modular logging for better debugging:

   - `main` – general startup logs
   - `nexoitems` – item conversion logs
   - `nexoassets` – asset copy logs
   - `convertpack` – pack.yml generation logs

---

## Folder Structure

### Input (Nexo format)
```
input/
├─ items/
│ ├─ armor.yml
│ ├─ weapons.yml
│ └─ subfolder/...
└─ pack/
└─ assets/...
```

### Output (Craft Engine format)
```
output/
├─ configuration/
│ ├─ items/*.yml
│ ├─ i18n.yml
│ ├─ categories.yml
│ └─ templates.yml
├─ resourcepack/
│ └─ assets/...
└─ pack.yml
```

---

## Example Usage

### Install dependencies
```bash
npm install
```

### Configure environment variables (optional)

#### Create a .env file in the root:
```
AUTHOR=NekoMonci12
VERSION=1.0.0
DESCRIPTION=Craft Engine Config Pack Converter
NAMESPACE=yuemi
```
Defaults will be used if variables are not set.

#### Run the migrator
```bash
node index.js
```
This will:
- Convert all Nexo items in input/items to Craft Engine YAML files in output/configuration/items.
- Generate i18n.yml, categories.yml, templates.yml.
- Copy Nexo assets from input/pack/assets to output/resourcepack/assets.
-Generate pack.yml in the output folder.

---

## Logging
Check logs in the `logs/` folder for detailed information.

## Notes
> **Note:** This tool currently **only supports Nexo-style item packs**.  
> Support for **ItemsAdder** format will be added in a future update.
