import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { VSCodeProjectContext, MAX_FILE_SIZE } from './types';
import { getProjectStructure, detectFileLanguage } from './utils';

export function activate(context: vscode.ExtensionContext) {
    const projectContext = new VSCodeProjectContext();
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

    function updateStatusBar() {
        const count = projectContext.files.length;
        if (count > 0) {
            statusBarItem.text = `$(file) ${count} files in context`;
            statusBarItem.show();
        } else {
            statusBarItem.hide();
        }
    }

    /**
     * Modified "Add to Context" command to support multiple selected files
     * and skip those that are already in the context.
     */
    const addToContextCommand = vscode.commands.registerCommand(
        'copy-project-context.addToContext',
        async (uriOrUris: vscode.Uri | vscode.Uri[]) => {
            try {
                // If the command is called with multiple selections, VS Code may pass an array of Uris.
                // Otherwise, it will be a single Uri.
                const uris = Array.isArray(uriOrUris) ? uriOrUris : [uriOrUris];

                const alreadyInContext: string[] = [];
                const newlyAdded: string[] = [];

                for (const uri of uris) {
                    // If already in context, skip it
                    if (projectContext.files.includes(uri.fsPath)) {
                        alreadyInContext.push(uri.fsPath);
                        continue;
                    }

                    // Check file size before adding
                    const stats = await fs.stat(uri.fsPath);
                    if (stats.size > MAX_FILE_SIZE) {
                        vscode.window.showWarningMessage(`File too large: ${uri.fsPath}`);
                        continue;
                    }

                    // Attempt to add to context
                    const added = projectContext.addFile(uri.fsPath);
                    if (added) {
                        newlyAdded.push(uri.fsPath);
                    }
                }

                // Update status bar
                updateStatusBar();

                // Show messages indicating results
                if (alreadyInContext.length > 0) {
                    vscode.window.showInformationMessage(
                        `Already in context (skipped):\n${alreadyInContext.join('\n')}`
                    );
                }
                if (newlyAdded.length > 0) {
                    vscode.window.showInformationMessage(
                        `Added to context:\n${newlyAdded.join('\n')}`
                    );
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to add file(s): ${error}`);
            }
        }
    );

    const removeFromContextCommand = vscode.commands.registerCommand(
        'copy-project-context.removeFromContext',
        async (uri: vscode.Uri) => {
            const removed = projectContext.removeFile(uri.fsPath);
            if (removed) {
                updateStatusBar();
                vscode.window.showInformationMessage(`Removed from context: ${uri.fsPath}`);
            }
        }
    );

    const removeAllFromContextCommand = vscode.commands.registerCommand(
        'copy-project-context.removeAllFromContext',
        async () => {
            projectContext.clear();
            updateStatusBar();
            vscode.window.showInformationMessage('All files removed from context.');
        }
    );

    const copyContextCommand = vscode.commands.registerCommand(
        'copy-project-context.execute',
        async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) {
                    vscode.window.showInformationMessage('No workspace folder open.');
                    return;
                }

                // Always get project structure
                const structure = await getProjectStructure(workspaceRoot);
                let content = structure;

                // Add copied files section if there are files
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

                                // Format content with proper spacing
                                return [
                                    `### File: ${relativePath}`,
                                    `\`\`\`${language}`,
                                    document.getText().trim(),
                                    '```',
                                    '' // Add empty line between files
                                ].join('\n');
                            } catch (error) {
                                return `### Error reading file: ${filePath}\n${error}\n`;
                            }
                        })
                    );

                    content += formattedFiles.join('\n');
                }

                // Ensure proper trimming and write to clipboard
                await vscode.env.clipboard.writeText(content.trim());
                vscode.window.showInformationMessage('Project context copied to clipboard!');
                
                // Clear the context after copying
                projectContext.clear();
                updateStatusBar();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to copy context: ${error}`);
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
