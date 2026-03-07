# Craft Engine Config Migrator

A Node.js utility to convert **Nexo** or **ItemsAdder** Minecraft item packs into **Craft Engine** format, including automatic generation of:

- 2D/3D items in Craft Engine YAML format
- `i18n.yml` for translations
- `categories.yml` with subcategories
- `templates.yml` for 2D item models
- `pack.yml` for Craft Engine
- Resource pack assets

---

## Supported Formats

- **Nexo** - Converts Nexo item packs to Craft Engine
- **ItemsAdder** - Converts ItemsAdder packs to Craft Engine

The converter can **auto-detect** the format based on folder structure, or you can specify it manually with the `FORMAT` environment variable.

---

## Features

1. **Item Conversion**  
   Converts Nexo/ItemsAdder item YAMLs (3D or 2D) into Craft Engine structure:

   - **Nexo**: 3D items with `custom_model_data` + `model`, 2D items with `texture`
   - **ItemsAdder**: 3D items with `model_path`
   - Automatically generates i18n entries
   - Automatically creates subcategories for each YAML file

2. **Resource Pack Assets**  
   Copies resource pack files to `output/resourcepack/assets`, with:

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
   - `nexoitems` / `itemsadderitems` – item conversion logs
   - `nexoassets` / `itemsadderassets` – asset copy logs
   - `convertpack` – pack.yml generation logs

---

## Folder Structure

### Input (Nexo format)
```
input/
├─ items/
│  ├─ armor.yml
│  ├─ weapons.yml
│  └─ subfolder/...
└─ pack/
   └─ assets/...
```

### Input (ItemsAdder format)
```
input/
├─ items_packs/
│  ├─ pack1/
│  │  ├─ pack1.yml
│  │  └─ pack1_categories.yml
│  └─ pack2/
│     └─ pack2.yml
└─ resource_pack/
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
```env
AUTHOR=NekoMonci12
VERSION=1.0.0
DESCRIPTION=Craft Engine Config Pack Converter
NAMESPACE=yuemi
FORMAT=auto
```

**Environment Variables:**
- `AUTHOR` - Pack author name (default: `Unknown`)
- `VERSION` - Pack version (default: `1.0.0`)
- `DESCRIPTION` - Pack description (default: `Craft Engine Config Pack Converter`)

**For Nexo format:**
- Converts all Nexo items in `input/items/` to Craft Engine YAML files in `output/configuration/items/`
- Copies Nexo assets from `input/pack/assets/` to `output/resourcepack/assets/`

**For ItemsAdder format:**
- Converts all ItemsAdder items in `input/items_packs/` to Craft Engine YAML files
- Copies resource pack assets from `input/resource_pack/assets/` to `output/resourcepack/assets/`

**Both formats:**
- Generate `i18n.yml`, `categories.yml`, `templates.yml`
- Copy assets to `output/resourcepack/assets/`
- Generate `pack.yml` in the output folder

---

## Logging
Check logs in the `logs/` folder for detailed information.

---

## Notes
- The converter auto-detects the format by default
- Both Nexo and ItemsAdder formats are fully supported
- Custom model data tracking and conflict detection included
- Subcategories are automatically created for each item file
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
