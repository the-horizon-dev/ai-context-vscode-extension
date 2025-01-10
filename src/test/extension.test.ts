import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

suite('Copy Project Context Extension', () => {
    const testWorkspace = path.join(__dirname, 'test-workspace');
    
    suiteSetup(async () => {
        await fs.mkdir(testWorkspace, { recursive: true });
    });

    setup(async () => {
        // Reset files before each test
        await fs.writeFile(path.join(testWorkspace, 'test.ts'), 'const x: number = 1;');
        await fs.writeFile(path.join(testWorkspace, 'test.js'), 'const y = 2;');
        // Clear clipboard
        await vscode.env.clipboard.writeText('');
    });

    suiteTeardown(async () => {
        await fs.rm(testWorkspace, { recursive: true, force: true });
    });

    test('Commands are registered', async () => {
        // Wait for extension to activate
        await new Promise(resolve => setTimeout(resolve, 1000));
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('copy-project-context.execute'), 'Execute command not registered');
        assert.ok(commands.includes('copy-project-context.addToContext'), 'Add to context command not registered');
    });

    test('Add file to context', async () => {
        const testFile = vscode.Uri.file(path.join(testWorkspace, 'test.ts'));
        await vscode.commands.executeCommand('copy-project-context.addToContext', testFile);
        
        // Verify through clipboard after executing copy command
        await vscode.commands.executeCommand('copy-project-context.execute');
        const clipboardContent = await vscode.env.clipboard.readText();
        
        assert.ok(clipboardContent.includes('```typescript'));
        assert.ok(clipboardContent.includes('const x: number = 1;'));
    });

    test('Multiple file types handling', async () => {
        const tsFile = vscode.Uri.file(path.join(testWorkspace, 'test.ts'));
        const jsFile = vscode.Uri.file(path.join(testWorkspace, 'test.js'));
        
        await vscode.commands.executeCommand('copy-project-context.addToContext', tsFile);
        await vscode.commands.executeCommand('copy-project-context.addToContext', jsFile);
        await vscode.commands.executeCommand('copy-project-context.execute');
        
        const clipboardContent = await vscode.env.clipboard.readText();
        
        assert.ok(clipboardContent.includes('```typescript'));
        assert.ok(clipboardContent.includes('```javascript'));
        assert.ok(clipboardContent.includes('const x: number = 1;'));
        assert.ok(clipboardContent.includes('const y = 2;'));
    });

    test('Empty context handling', async () => {
        // Ensure clean state
        await vscode.env.clipboard.writeText('');
        await vscode.commands.executeCommand('copy-project-context.execute');
        const clipboardContent = await vscode.env.clipboard.readText();
        assert.strictEqual(clipboardContent, '', 'Clipboard should be empty when no files in context');
    });
});
