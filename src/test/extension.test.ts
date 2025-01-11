import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

suite('Copy Project Context Extension', () => {
    const testWorkspace = path.join(__dirname, 'test-workspace');
    
    suiteSetup(async () => {
        await fs.mkdir(testWorkspace, { recursive: true });
        // Create a workspace and open it
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(testWorkspace));
        // Wait for extension to activate
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    setup(async () => {
        // Clear previous state
        await vscode.env.clipboard.writeText('');
        
        // Reset files before each test
        await fs.writeFile(path.join(testWorkspace, 'test.ts'), 'const x: number = 1;');
        await fs.writeFile(path.join(testWorkspace, 'test.js'), 'const y = 2;');
        
        // Ensure files are created
        await new Promise(resolve => setTimeout(resolve, 100));
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

    test('Project structure and file content', async () => {
        const tsFile = vscode.Uri.file(path.join(testWorkspace, 'test.ts'));
        await vscode.commands.executeCommand('copy-project-context.addToContext', tsFile);
        await vscode.commands.executeCommand('copy-project-context.execute');
        
        const clipboardContent = await vscode.env.clipboard.readText();
        
        assert.ok(clipboardContent.includes('# Project Structure'));
        assert.ok(clipboardContent.includes('# Copied Context'));
        assert.ok(clipboardContent.includes('### File: '));
        assert.ok(clipboardContent.includes('```typescript'));
    });

    test('Prevent duplicate files in context', async () => {
        const tsFile = vscode.Uri.file(path.join(testWorkspace, 'test.ts'));
        
        // Add file first time
        await vscode.commands.executeCommand('copy-project-context.addToContext', tsFile);
        
        // Try to add same file again
        await vscode.commands.executeCommand('copy-project-context.addToContext', tsFile);
        
        // Copy and verify only one instance exists
        await vscode.commands.executeCommand('copy-project-context.execute');
        const clipboardContent = await vscode.env.clipboard.readText();
        
        const matches = clipboardContent.match(/```typescript/g) || [];
        assert.strictEqual(matches.length, 1, 'File should appear only once in context');
    });

    test('Content reflects latest changes', async () => {
        const tsFile = vscode.Uri.file(path.join(testWorkspace, 'test.ts'));
        
        // Add file to context
        await vscode.commands.executeCommand('copy-project-context.addToContext', tsFile);
        
        // Modify file content
        await fs.writeFile(tsFile.fsPath, 'const updated: number = 42;');
        
        // Copy and verify updated content
        await vscode.commands.executeCommand('copy-project-context.execute');
        const clipboardContent = await vscode.env.clipboard.readText();
        
        assert.ok(clipboardContent.includes('const updated: number = 42;'), 'Should contain updated content');
    });

    test('Remove file from context', async () => {
        const tsFile = vscode.Uri.file(path.join(testWorkspace, 'test.ts'));
        
        await vscode.commands.executeCommand('copy-project-context.addToContext', tsFile);
        await vscode.commands.executeCommand('copy-project-context.removeFromContext', tsFile);
        await vscode.commands.executeCommand('copy-project-context.execute');
        
        const clipboardContent = await vscode.env.clipboard.readText();
        assert.ok(!clipboardContent.includes('```typescript'), 'Removed file should not appear in context');
    });

    test('File size limit', async () => {
        const largeFile = path.join(testWorkspace, 'large.ts');
        // Create a file larger than 1MB
        await fs.writeFile(largeFile, 'x'.repeat(1024 * 1024 + 1));
        
        const uri = vscode.Uri.file(largeFile);
        await vscode.commands.executeCommand('copy-project-context.addToContext', uri);
        
        await vscode.commands.executeCommand('copy-project-context.execute');
        const clipboardContent = await vscode.env.clipboard.readText();
        assert.ok(!clipboardContent.includes('large.ts'), 'Large file should not be added to context');
    });
});
