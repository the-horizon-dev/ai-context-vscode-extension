import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { VSCodeProjectContext, MAX_FILE_SIZE } from './types';
import { getProjectStructure, detectFileLanguage } from './utils';

export function activate(context: vscode.ExtensionContext) {
    const projectContext = new VSCodeProjectContext();
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

    /**
     * Update the status bar to reflect how many files are currently in context.
     */
    function updateStatusBar() {
        const count = projectContext.files.length;
        if (count > 0) {
            statusBarItem.text = `$(file) ${count} file${count > 1 ? 's' : ''} in context`;
            statusBarItem.show();
        } else {
            statusBarItem.hide();
        }
    }

    /**
     * Get user setting to determine whether or not we clear context after copy.
     */
    function shouldClearAfterCopy(): boolean {
        return vscode.workspace
            .getConfiguration('copyProjectContext')
            .get<boolean>('clearAfterCopy', true);
    }

    /**
     * Utility to pick a workspace folder if more than one is open.
     */
    async function pickWorkspaceFolder(): Promise<string | undefined> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showInformationMessage('No workspace folder open.');
            return undefined;
        }
        if (folders.length === 1) {
            return folders[0].uri.fsPath;
        }
        // Prompt user to pick a folder if multiple are open
        const chosen = await vscode.window.showQuickPick(
            folders.map((f) => f.name),
            { placeHolder: 'Select a workspace folder' }
        );
        if (!chosen) {
            return undefined;
        }
        const folder = folders.find((f) => f.name === chosen);
        return folder?.uri.fsPath;
    }

    /**
     * "Add to Context" command:
     * - Accepts one or multiple file URIs.
     * - Skips files that are already in context.
     * - Warns on files that exceed size limit.
     */
    const addToContextCommand = vscode.commands.registerCommand(
        'copy-project-context.addToContext',
        async (uriOrUris: vscode.Uri | vscode.Uri[]) => {
            try {
                // If the command is called with multiple selections, VS Code may pass an array of Uris.
                // Otherwise, it will be a single Uri. If no Uri is provided, show a quick warning.
                if (!uriOrUris) {
                    vscode.window.showInformationMessage('No file selected.');
                    return;
                }
                const uris = Array.isArray(uriOrUris) ? uriOrUris : [uriOrUris];

                if (uris.length === 0) {
                    vscode.window.showInformationMessage('No file selected.');
                    return;
                }

                const alreadyInContext: string[] = [];
                const newlyAdded: string[] = [];
                const tooLarge: string[] = [];

                // Read stats in parallel
                await Promise.all(
                    uris.map(async (uri) => {
                        const filePath = uri.fsPath;

                        // If already in context, skip
                        if (projectContext.files.includes(filePath)) {
                            alreadyInContext.push(filePath);
                            return;
                        }

                        // Check file size before adding
                        try {
                            const stats = await fs.stat(filePath);
                            if (stats.size > MAX_FILE_SIZE) {
                                tooLarge.push(filePath);
                                return;
                            }
                        } catch (error) {
                            vscode.window.showErrorMessage(`Failed to read file stats: ${filePath}`);
                            return;
                        }

                        // Attempt to add to context
                        const added = projectContext.addFile(filePath);
                        if (added) {
                            newlyAdded.push(filePath);
                        }
                    })
                );

                // Update status bar
                updateStatusBar();

                // Show messages indicating results
                let msg = '';
                if (newlyAdded.length > 0) {
                    msg += `Added to context: ${newlyAdded.length} file(s)\n` +
                           newlyAdded.map((f) => path.basename(f)).join(', ') + '\n';
                }
                if (alreadyInContext.length > 0) {
                    msg += `Already in context (skipped): ${alreadyInContext.length} file(s)\n` +
                           alreadyInContext.map((f) => path.basename(f)).join(', ') + '\n';
                }
                if (tooLarge.length > 0) {
                    msg += `File(s) too large: ${tooLarge.length} file(s)\n` +
                           tooLarge.map((f) => path.basename(f)).join(', ') + '\n';
                }
                if (msg) {
                    vscode.window.showInformationMessage(msg.trim());
                } else {
                    vscode.window.showInformationMessage('No files were added.');
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
        'copy-project-context.removeFromContext',
        async (uri: vscode.Uri) => {
            if (!uri) {
                vscode.window.showInformationMessage('No file selected for removal.');
                return;
            }
            const removed = projectContext.removeFile(uri.fsPath);
            if (removed) {
                updateStatusBar();
                vscode.window.showInformationMessage(`Removed from context: ${uri.fsPath}`);
            } else {
                vscode.window.showInformationMessage(`File was not in context: ${uri.fsPath}`);
            }
        }
    );

    /**
     * "Remove All From Context" command:
     * - Clears the entire context.
     */
    const removeAllFromContextCommand = vscode.commands.registerCommand(
        'copy-project-context.removeAllFromContext',
        async () => {
            projectContext.clear();
            updateStatusBar();
            vscode.window.showInformationMessage('All files removed from context.');
        }
    );

    /**
     * "Copy Context" command:
     * - Prompts the user to pick a workspace if multiple exist.
     * - Builds project structure from chosen workspace root.
     * - Reads each file in context, formats it, and appends to the final string.
     * - Copies the entire formatted output to the clipboard.
     * - Optionally clears context after copy, based on user setting.
     */
    const copyContextCommand = vscode.commands.registerCommand(
        'copy-project-context.execute',
        async () => {
            try {
                const workspaceRoot = await pickWorkspaceFolder();
                if (!workspaceRoot) {
                    return;
                }

                // Always get project structure from the chosen workspace
                const structure = await getProjectStructure(workspaceRoot);
                let content = structure;

                // If there are files in the context, add "Copied Context" section
                if (projectContext.files.length > 0) {
                    content += '\n\n# Copied Context\n';
                    const formattedFiles = await Promise.all(
                        projectContext.files.map(async (filePath) => {
                            try {
                                // Check file existence
                                const exists = await fs
                                    .access(filePath)
                                    .then(() => true)
                                    .catch(() => false);

                                if (!exists) {
                                    return `\n### File: ${filePath} (not found)\n`;
                                }

                                // Read file content
                                const document = await vscode.workspace.openTextDocument(filePath);
                                const relativePath = path.relative(workspaceRoot, filePath);
                                const language = detectFileLanguage(filePath);

                                return [
                                    `### File: ${relativePath}`,
                                    `\`\`\`${language}`,
                                    document.getText().trim(),
                                    '```',
                                    '' // Add empty line between files
                                ].join('\n');
                            } catch (error) {
                                return `### Error reading file: ${filePath}\n${String(error)}\n`;
                            }
                        })
                    );

                    content += formattedFiles.join('\n');
                }

                // Copy the result to clipboard
                const finalContent = content.trimEnd();
                await vscode.env.clipboard.writeText(finalContent);
                vscode.window.showInformationMessage('Project context copied to clipboard!');

                // Clear the context, if user setting is enabled
                if (shouldClearAfterCopy()) {
                    projectContext.clear();
                    updateStatusBar();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to copy context: ${String(error)}`);
            }
        }
    );

    context.subscriptions.push(
        statusBarItem,
        addToContextCommand,
        removeFromContextCommand,
        removeAllFromContextCommand,
        copyContextCommand
    );
}

export function deactivate() {}
