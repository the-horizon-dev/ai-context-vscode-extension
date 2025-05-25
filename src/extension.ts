import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { VSCodeProjectContext, MAX_FILE_SIZE } from "./types";
import {
  getProjectStructure,
  detectFileLanguage,
  getIgnoredDirs,
  getIgnoredFiles,
} from "./utils";

export function activate(context: vscode.ExtensionContext) {
  const projectContext = new VSCodeProjectContext();
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );


  /**
   * Update the status bar to reflect how many files are currently in context.
   * The status bar is clickable to show the list of files for removal.
   */
  function updateStatusBar() {
    const count = projectContext.files.length;
    if (count > 0) {
      statusBarItem.text = `$(file) ${count} file${
        count > 1 ? "s" : ""
      } in context`;
      statusBarItem.command = "copy-project-context.showContextList";
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }

  /**
   * Get user setting to determine whether or not to clear the context after copying.
   */
  function shouldClearAfterCopy(): boolean {
    return vscode.workspace
      .getConfiguration("copyProjectContext")
      .get<boolean>("clearAfterCopy", true);
  }

  /**
   * Utility to pick a workspace folder if more than one is open.
   */
  async function pickWorkspaceFolder(): Promise<string | undefined> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showInformationMessage("No workspace folder open.");
      return undefined;
    }
    if (folders.length === 1) {
      return folders[0].uri.fsPath;
    }
    const chosen = await vscode.window.showQuickPick(
      folders.map((f) => f.name),
      { placeHolder: "Select a workspace folder" }
    );
    if (!chosen) {
      return undefined;
    }
    const folder = folders.find((f) => f.name === chosen);
    return folder?.uri.fsPath;
  }

  /**
   * Recursively gathers all file URIs under a given folder.
   * If the URI is a file, returns an array containing just that URI.
   */
  async function gatherFileUris(
    uri: vscode.Uri,
    ignoredDirs: Set<string>,
    ignoredFiles: Set<string>
  ): Promise<vscode.Uri[]> {
    try {
      const stat = await fs.stat(uri.fsPath);
      const name = path.basename(uri.fsPath);

      if (stat.isFile()) {
        if (ignoredFiles.has(name) || name.startsWith(".")) {
          return [];
        }
        return [uri];
      } else if (stat.isDirectory()) {
        if (ignoredDirs.has(name) || name.startsWith(".")) {
          return [];
        }
        const entries = await fs.readdir(uri.fsPath, { withFileTypes: true });
        let fileUris: vscode.Uri[] = [];
        for (const entry of entries) {
          const childUri = vscode.Uri.file(path.join(uri.fsPath, entry.name));
          // Recursively gather files from subdirectories.
          const childFiles = await gatherFileUris(childUri, ignoredDirs, ignoredFiles);
          fileUris = fileUris.concat(childFiles);
        }
        return fileUris;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error reading ${uri.fsPath}: ${error}`);
    }
    return [];
  }

  /**
   * "Add to Context" command:
   * - Accepts one or multiple file or folder URIs.
   * - If no URI is provided (e.g. via the Command Palette), a file picker dialog opens.
   * - For each selected folder, all files inside are added (recursively).
   * - Skips files already in context and warns on files that exceed the size limit.
   */
  const addToContextCommand = vscode.commands.registerCommand(
    "copy-project-context.addToContext",
    async (uriOrUris?: vscode.Uri | vscode.Uri[]) => {
      try {
        // If no URI is provided, open a file picker dialog.
        if (!uriOrUris) {
          const selectedUris = await vscode.window.showOpenDialog({
            canSelectMany: true,
            canSelectFiles: true,
            canSelectFolders: true,
            openLabel: "Add to Context",
          });
          if (!selectedUris || selectedUris.length === 0) {
            vscode.window.showInformationMessage("No file or folder selected.");
            return;
          }
          uriOrUris = selectedUris;
        }
        const uris = Array.isArray(uriOrUris) ? uriOrUris : [uriOrUris];

        // Gather all file URIs from the selection, expanding folders recursively.
        let allFileUris: vscode.Uri[] = [];
        for (const uri of uris) {
          const folder = vscode.workspace.getWorkspaceFolder(uri);
          const root = folder?.uri.fsPath;
          const dirs = getIgnoredDirs(root);
          const files = getIgnoredFiles(root);
          const gathered = await gatherFileUris(uri, dirs, files);
          allFileUris = allFileUris.concat(gathered);
        }
        // Remove duplicates based on the file path.
        const uniqueFiles = Array.from(
          new Map(allFileUris.map((f) => [f.fsPath, f])).values()
        );

        const alreadyInContext: string[] = [];
        const newlyAdded: string[] = [];
        const tooLarge: string[] = [];

        await Promise.all(
          uniqueFiles.map(async (uri) => {
            const filePath = uri.fsPath;
            if (projectContext.files.includes(filePath)) {
              alreadyInContext.push(filePath);
              return;
            }
            try {
              const stats = await fs.stat(filePath);
              if (stats.size > MAX_FILE_SIZE) {
                tooLarge.push(filePath);
                return;
              }
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to read file stats: ${filePath}`
              );
              return;
            }
            const added = projectContext.addFile(filePath);
            if (added) {
              newlyAdded.push(filePath);
            }
          })
        );

        updateStatusBar();

        let msg = "";
        if (newlyAdded.length > 0) {
          msg +=
            `Added to context: ${newlyAdded.length} file(s)\n` +
            newlyAdded.map((f) => path.basename(f)).join(", ") +
            "\n";
        }
        if (alreadyInContext.length > 0) {
          msg +=
            `Already in context (skipped): ${alreadyInContext.length} file(s)\n` +
            alreadyInContext.map((f) => path.basename(f)).join(", ") +
            "\n";
        }
        if (tooLarge.length > 0) {
          msg +=
            `File(s) too large: ${tooLarge.length} file(s)\n` +
            tooLarge.map((f) => path.basename(f)).join(", ") +
            "\n";
        }
        if (msg) {
          vscode.window.showInformationMessage(msg.trim());
        } else {
          vscode.window.showInformationMessage("No files were added.");
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to add file(s): ${error}`);
      }
    }
  );

  /**
   * "Remove From Context" command:
   * - Removes a single file from the context if it exists.
   */
  const removeFromContextCommand = vscode.commands.registerCommand(
    "copy-project-context.removeFromContext",
    async (uri: vscode.Uri) => {
      if (!uri) {
        vscode.window.showInformationMessage("No file selected for removal.");
        return;
      }
      const removed = projectContext.removeFile(uri.fsPath);
      if (removed) {
        updateStatusBar();
        vscode.window.showInformationMessage(
          `Removed from context: ${uri.fsPath}`
        );
      } else {
        vscode.window.showInformationMessage(
          `File was not in context: ${uri.fsPath}`
        );
      }
    }
  );

  /**
   * "Remove All From Context" command:
   * - Clears the entire context.
   */
  const removeAllFromContextCommand = vscode.commands.registerCommand(
    "copy-project-context.removeAllFromContext",
    async () => {
      projectContext.clear();
      updateStatusBar();
      vscode.window.showInformationMessage("All files removed from context.");
    }
  );

  /**
   * "Show Context List" command:
   * - Displays a QuickPick list of files currently in context.
   * - Allows the user to remove a selected file.
   */
  const showContextListCommand = vscode.commands.registerCommand(
    "copy-project-context.showContextList",
    async () => {
      const fileList = projectContext.files.map((f) => ({
        label: path.basename(f),
        description: f,
      }));
      if (fileList.length === 0) {
        vscode.window.showInformationMessage("No files in context.");
        return;
      }
      const selected = await vscode.window.showQuickPick(fileList, {
        placeHolder: "Select a file to remove from context",
      });
      if (selected) {
        const removed = projectContext.removeFile(selected.description!);
        if (removed) {
          updateStatusBar();
          vscode.window.showInformationMessage(
            `Removed ${selected.label} from context.`
          );
        }
      }
    }
  );

  /**
   * "Toggle Clear After Copy" command:
   * - Flips the `copyProjectContext.clearAfterCopy` setting.
   */
  const toggleClearCommand = vscode.commands.registerCommand(
    "copy-project-context.toggleClearAfterCopy",
    async () => {
      const config = vscode.workspace.getConfiguration("copyProjectContext");
      const current = config.get<boolean>("clearAfterCopy", true);
      await config.update(
        "clearAfterCopy",
        !current,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(
        `Clear after copy is now ${!current ? "enabled" : "disabled"}.`
      );
    }
  );

  /**
   * "Copy Context" command:
   * - Prompts the user to pick a workspace folder if multiple exist.
   * - Builds the project structure from the chosen workspace root.
   * - Reads each file in context, formats its content, and appends it to the final string.
   * - Copies the complete content directly to the clipboard.
   * - Optionally clears the context after copying.
   */
  const copyContextCommand = vscode.commands.registerCommand(
    "copy-project-context.execute",
    async () => {
      try {
        const workspaceRoot = await pickWorkspaceFolder();
        if (!workspaceRoot) {
          return;
        }
        const structure = await getProjectStructure(workspaceRoot);
        let content = structure;
        if (projectContext.files.length > 0) {
          content += "\n\n# Copied Context\n";
          const formattedFiles = await Promise.all(
            projectContext.files.map(async (filePath) => {
              try {
                const exists = await fs
                  .access(filePath)
                  .then(() => true)
                  .catch(() => false);
                if (!exists) {
                  return `\n### File: ${filePath} (not found)\n`;
                }
                const document = await vscode.workspace.openTextDocument(
                  filePath
                );
                const relativePath = path.relative(workspaceRoot, filePath);
                const language = detectFileLanguage(filePath);
                return [
                  `### File: ${relativePath}`,
                  `\`\`\`${language}`,
                  document.getText().trim(),
                  "```",
                  "",
                ].join("\n");
              } catch (error) {
                return `### Error reading file: ${filePath}\n${String(
                  error
                )}\n`;
              }
            })
          );
          content += formattedFiles.join("\n");
        }
        const finalContent = content.trimEnd();

        // Copy the final content directly to the clipboard.
        await vscode.env.clipboard.writeText(finalContent);
        vscode.window.showInformationMessage(
          "Project context copied to clipboard!"
        );
        if (shouldClearAfterCopy()) {
          projectContext.clear();
          updateStatusBar();
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to copy context: ${String(error)}`
        );
      }
    }
  );

  context.subscriptions.push(
    statusBarItem,
    addToContextCommand,
    removeFromContextCommand,
    removeAllFromContextCommand,
    showContextListCommand,
    toggleClearCommand,
    copyContextCommand
  );
}

export function deactivate() {}
