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
        assert.ok(commands.includes('copy-project-context.removeAllFromContext'), 'Remove all from context command not registered');
    });

    // -------------------------------------------------------------
    // Existing tests omitted for brevity...
    // -------------------------------------------------------------

    /**
     * NEW TEST #1:
     * Verifies adding multiple files at once.
     */
    test('Add multiple files at once to context', async () => {
        const tsFile = vscode.Uri.file(path.join(testWorkspace, 'test.ts'));
        const jsFile = vscode.Uri.file(path.join(testWorkspace, 'test.js'));

        // Add both files in one command call
        await vscode.commands.executeCommand('copy-project-context.addToContext', [tsFile, jsFile]);

        // Now trigger the copy
        await vscode.commands.executeCommand('copy-project-context.execute');
        const clipboardContent = await vscode.env.clipboard.readText();

        // Assert that both file contents appear in the clipboard
        assert.ok(clipboardContent.includes('```typescript'));
        assert.ok(clipboardContent.includes('const x: number = 1;'));
        assert.ok(clipboardContent.includes('```javascript'));
        assert.ok(clipboardContent.includes('const y = 2;'));
    });

    /**
     * NEW TEST #2:
     * Verifies that duplicates are not re-added when adding multiple files at once.
     */
    test('Add multiple files, skipping duplicates', async () => {
        const tsFile = vscode.Uri.file(path.join(testWorkspace, 'test.ts'));
        const jsFile = vscode.Uri.file(path.join(testWorkspace, 'test.js'));

        // First, add the TS file alone
        await vscode.commands.executeCommand('copy-project-context.addToContext', tsFile);

        // Attempt to add TS & JS together, TS is already in context
        await vscode.commands.executeCommand('copy-project-context.addToContext', [tsFile, jsFile]);

        // Copy context to clipboard
        await vscode.commands.executeCommand('copy-project-context.execute');
        const clipboardContent = await vscode.env.clipboard.readText();

        // Make sure TS code snippet only appears once
        const tsMatches = clipboardContent.match(/```typescript/g) || [];
        assert.strictEqual(tsMatches.length, 1, 'TS file should appear only once in context');

        // JS snippet should appear
        assert.ok(clipboardContent.includes('```javascript'));
        assert.ok(clipboardContent.includes('const y = 2;'), 'JS file content should appear');

        // TS snippet should contain the correct content
        assert.ok(clipboardContent.includes('const x: number = 1;'), 'TS file content should appear');
    });
});
