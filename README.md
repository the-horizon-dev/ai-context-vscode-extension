# Copy Project Context

A Visual Studio Code extension that simplifies copying file contents as formatted code blocks, perfect for sharing context with AI models or in documentation.

## Features

- **Easy File Selection**: Right-click any file and select "Add to Context" to include it in your clipboard collection.
- **Smart Language Detection**: Automatically detects and formats code blocks based on file extensions:
  - `.ts` → ```typescript
  - `.js` → ```javascript
  - `.json` → ```json
  - `.md` → ```markdown
  - `.py` → ```python
  - `.html` → ```html
  - `.css` → ```css
  - Other files → ```plaintext

- **Bulk Copy**: Right-click any folder to "Copy Project Context" and get all selected files formatted and ready to paste.
- **Clean Output**: Files are wrapped in appropriate language code blocks, perfect for documentation or AI interactions.

## Usage

1. **Adding Files**:
   - Right-click any file in the explorer
   - Select "Add to Context"
   - Repeat for all files you want to include

2. **Copying Everything**:
   - Right-click any folder or empty space in the explorer
   - Select "Copy Project Context"
   - All previously added files will be formatted and copied to your clipboard

3. **Pasting**:
   - Use Ctrl+V (Cmd+V on macOS) anywhere to paste your formatted context
   - Each file will be properly formatted with language-specific code blocks

## Example Output

```typescript
// example.ts
interface User {
    name: string;
    age: number;
}
```

```javascript
// utils.js
function formatDate(date) {
    return date.toISOString();
}
```

## Requirements

- Visual Studio Code version 1.96.0 or higher

## Known Issues

None reported. Please submit issues on our GitHub repository.

## Contributing

Feel free to submit pull requests or create issues for bugs and feature requests.

## License

MIT
