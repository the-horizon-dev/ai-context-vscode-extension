import * as vscode from 'vscode';

interface ContextFile {
    path: string;
    language: string;
    content?: string;
}

interface ProjectContext {
    files: ContextFile[];
    addFile(path: string): void;
    clear(): void;
}

class VSCodeProjectContext implements ProjectContext {
    private _files: ContextFile[] = [];

    get files(): ContextFile[] {
        return this._files;
    }

    addFile(path: string): void {
        const language = this.detectFileLanguage(path);
        this._files.push({ path, language });
    }

    clear(): void {
        this._files = [];
    }

    private detectFileLanguage(filePath: string): string {
        const extensionMap: Record<string, string> = {
            '.ts': 'typescript',
            '.js': 'javascript',
            '.json': 'json',
            '.md': 'markdown',
            '.py': 'python',
            '.html': 'html',
            '.css': 'css',
        };

        const extension = filePath.slice(filePath.lastIndexOf('.'));
        return extensionMap[extension] || 'plaintext';
    }
}

export function activate(context: vscode.ExtensionContext) {
    const projectContext = new VSCodeProjectContext();

    const addToContextCommand = vscode.commands.registerCommand(
        'copy-project-context.addToContext',
        async (uri: vscode.Uri) => {
            projectContext.addFile(uri.fsPath);
            vscode.window.showInformationMessage(
                `Added to context: ${uri.fsPath}`
            );
        }
    );

    const copyContextCommand = vscode.commands.registerCommand(
        'copy-project-context.execute',
        async () => {
            if (projectContext.files.length === 0) {
                await vscode.env.clipboard.writeText('');
                vscode.window.showInformationMessage('No files in context.');
                return;
            }

            const formattedContent = await formatContextFiles(projectContext.files);
            await vscode.env.clipboard.writeText(formattedContent);
            vscode.window.showInformationMessage('Context copied to clipboard!');
            projectContext.clear();
        }
    );

    context.subscriptions.push(addToContextCommand, copyContextCommand);
}

async function formatContextFiles(files: ContextFile[]): Promise<string> {
    const formattedFiles = await Promise.all(
        files.map(async (file) => {
            const document = await vscode.workspace.openTextDocument(file.path);
            return `\`\`\`${file.language}\n${document.getText()}\n\`\`\`\n\n`;
        })
    );

    return formattedFiles.join('').trim();
}

export function deactivate() {}
