# Code Style and Structure Guidelines
This guide sets the coding style and structure rules for this project.

---

## 1. File & Module Structure
- Keep code modular. Functions go into `functions/` folder.
  - Example: `functions/nexo/convertItems.js`, `functions/logger.js`
- Utility helpers go into `helpers/` folder.
  - Example: `helpers/yamlHelper.js`, `helpers/fileHelper.js`
- Events go into `events/` folder.
  - Example: `events/onItemConvert.js`
- Each module should `module.exports` only the functions it exposes.
- Avoid writing large monolithic scripts; split logic by responsibility.

---

## 2. Naming Conventions
- **Variables & functions:** `camelCase`
- **Constants:** `UPPER_CASE` (for CMD ranges, material types, etc.)
- **Files:** `camelCase.js`
- **Classes (if any):** `PascalCase`
- **Namespaces:** Use lowercase (e.g., `minecraft`)

---

## 3. Case Rules
- Normalize all Minecraft materials to **UPPERCASE** when storing or tracking.
- Namespace and item IDs remain **lowercase** in the format: `${namespace}:${itemKey}`

---

## 4. Logging
- Use modular loggers per purpose:
  - `loggerNexo` → general conversion logs
  - `loggerDuplicates` → skipped duplicate items
  - `loggerSameIds` → conflicting CMD IDs
- Always include file path and item key in logs for traceability.

---

## 5. Code Style
- Use **ES6+ syntax**:
  - `const` / `let` for variables
  - Arrow functions where appropriate
  - Template literals for string concatenation
- Include **try/catch** for file operations and conversions.
- Prefer **destructuring** for objects and arrays.
- Keep functions **single-purpose** and readable.

---

## 6. YAML Handling
- Use `yamlHelper.js` for all YAML reading/writing.
  - `readYaml(path)` → object
  - `writeYaml(path, data)` → YAML file
- Never modify original input files directly.

---

## 7. Error Handling
- Implement robust error handling with clear messages.
- Log errors with context (file path, item key) for easier debugging.
- Avoid silent failures; always inform the user of issues.

---

## 8. Node.js Practices
- Use asynchronous file operations (`fs.promises`).
- Avoid blocking the event loop; use async/await.
- Keep dependencies minimal and relevant.
- Regularly update dependencies to patch vulnerabilities.

---

## 9. JavaScript Best Practices
- Follow DRY (Don't Repeat Yourself) principles.
- Write comments for complex logic.
- Use meaningful variable and function names.
- Use CommonJS module system (`require`/`module.exports`).

---

## 10. Comments Rules
- Use `//` for single-line comments.
- Use `/* ... */` for multi-line comments.
- Comment on the purpose of functions and complex logic.
- Avoid redundant comments that state the obvious.
- Avoid Comment on single lines of code that are self-explanatory.
- Avoid Commenting that can make git diffs noisy.

---

## 11. Formatting
- Use 2 spaces for indentation.
- Ensure consistent spacing around operators and after commas.
- Use blank lines to separate logical sections of code for readability.
- Avoid Refacttoring that doesnt need to be done.
- Avoid Excessive nesting of code blocks.
- Avoid Refactoring code that is already clear and efficient.
- Avoid Over-commenting simple code sections.
- Avoid Inconsistent formatting styles within the same file.
- Avoid Deeply nested structures that reduce readability.
- Avoid Long functions that could be broken down into smaller ones.
- Avoid Redundant code that doesn't add value.
- Avoid Ignoring linting or formatting warnings/errors.
- Avoid Mixing different coding styles in the same project.
- Avoid Overcomplicating simple logic with unnecessary abstractions.
- Avoid Neglecting to update comments when code changes.