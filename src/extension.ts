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

    const addToContextCommand = vscode.commands.registerCommand(
        'copy-project-context.addToContext',
        async (uri: vscode.Uri) => {
            try {
                const stats = await fs.stat(uri.fsPath);
                if (stats.size > MAX_FILE_SIZE) {
                    vscode.window.showWarningMessage(`File too large: ${uri.fsPath}`);
                    return;
                }

                const added = projectContext.addFile(uri.fsPath);
                if (!added) {
                    vscode.window.showInformationMessage(`File already in context: ${uri.fsPath}`);
                    return;
                }
                updateStatusBar();
                vscode.window.showInformationMessage(`Added to context: ${uri.fsPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to add file: ${error}`);
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
                                if (!await fs.access(filePath).then(() => true).catch(() => false)) {
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
                                    ''  // Add empty line between files
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
        copyContextCommand,
        removeAllFromContextCommand
    );
}

export function deactivate() {}
