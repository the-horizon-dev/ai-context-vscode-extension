# Change Log

## [0.0.11] - 2025-02-07

### Added
- **Custom Ignore Lists:** New settings `copyProjectContext.ignoredDirectories` and `copyProjectContext.ignoredFiles` allow customization of skipped paths.
- **Hidden Files Test:** Added a test ensuring hidden files are ignored.

### Fixed
- **Package Version Sync:** Updated `package-lock.json` to match extension version.

## [0.0.10] - 2025-02-06

### Added
- **Toggle Clear After Copy:** New command `copy-project-context.toggleClearAfterCopy` toggles whether the context is cleared automatically after copying.

### Fixed
- **Ignore Lists When Adding Folders:** The extension now skips files and directories like `node_modules` and `.git` when adding folders to the context.

---

## [0.0.9] - 2025-02-05

### Added
- **Folder & File Selection Enhancements:**  
  The "Add File Content to Project Context" command now supports selecting both files and folders. When a folder is selected, all files within it (recursively) are added—along with any individually selected files. Duplicate files are automatically skipped.
- **Clickable Status Bar:**  
  The status bar now displays the current number of files in context and is clickable. Clicking it opens a QuickPick list that allows users to remove any file directly.
- **New Command - Show Files in Project Context:**  
  Added the `copy-project-context.showContextList` command, which lists all files in the context and provides easy management options.
- **Actionable Notifications:**  
  Enhanced notifications now offer clear feedback and direct actions to improve overall user workflow.

### Improved
- **Direct Copy Functionality:**  
  The "Copy Project Context" command now copies the formatted project context directly to the clipboard without a preview step.
- **User Feedback & Error Handling:**  
  Improved error messages and user feedback during file operations (adding, removing, and copying) provide more detailed guidance.
- **Command Palette & Keybindings:**  
  Updated command names and keybindings (e.g., `Ctrl+Shift+C` for copying and `Ctrl+Shift+A` for adding files) to streamline workflows.

---

## [0.0.8] - 2025-01-11

### Added
- First release of the extension.
- Support for adding files to the context.
- Support for removing files from the context.
- Support for listing files in the context.
- Support for clearing the context.

---

## [0.0.7] - 2025-01-11

### Added
- Added an extension video demo to the README.

---

## [0.0.6] - 2025-01-11

### Added
- Support for adding multiple files at once to the context.
- Tests for adding multiple files and handling duplicates.

### Improved
- Error handling and user feedback for file operations.

---

## [0.0.1] - 2025-01-10

### Added
- Initial support for adding files to the context.
- Functionality to remove files from the context.
- Ability to list files currently in the context.
- Feature to clear the context entirely.
