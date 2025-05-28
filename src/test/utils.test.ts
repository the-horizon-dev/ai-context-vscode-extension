import * as assert from 'assert';
import { detectFileLanguage, getProjectStructure } from '../utils';
import * as path from 'path';
import * as fs from 'fs/promises';

suite('Utils Tests', () => {
    const testWorkspace = path.join(__dirname, 'test-workspace');
    
    suiteSetup(async () => {
        await fs.mkdir(testWorkspace, { recursive: true });
        await fs.writeFile(path.join(testWorkspace, 'test.ts'), '');
        await fs.mkdir(path.join(testWorkspace, 'src'), { recursive: true });
    });

    suiteTeardown(async () => {
        await fs.rm(testWorkspace, { recursive: true, force: true });
    });

    suite('detectFileLanguage', () => {
        test('detects TypeScript files', () => {
            assert.strictEqual(detectFileLanguage('file.ts'), 'typescript');
            assert.strictEqual(detectFileLanguage('file.tsx'), 'typescript');
        });

        test('detects special files', () => {
            assert.strictEqual(detectFileLanguage('Dockerfile'), 'dockerfile');
            assert.strictEqual(detectFileLanguage('package.json'), 'json5');
        });

        test('handles unknown extensions', () => {
            assert.strictEqual(detectFileLanguage('file.unknown'), 'plaintext');
        });
    });

    suite('getProjectStructure', () => {
        test('generates correct structure', async () => {
            const structure = await getProjectStructure(testWorkspace);
            assert.ok(structure.includes('# Project Structure'));
            assert.ok(structure.includes('test.ts'));
            assert.ok(structure.includes('src'));
        });

        test('ignores specified directories', async () => {
            await fs.mkdir(path.join(testWorkspace, 'node_modules'), { recursive: true });
            const structure = await getProjectStructure(testWorkspace);
            assert.ok(!structure.includes('node_modules'));
        });

        test('ignores specified files', async () => {
            await fs.writeFile(path.join(testWorkspace, 'README.md'), '');
            const structure = await getProjectStructure(testWorkspace);
            assert.ok(!structure.includes('README.md'));
        });

        test('respects config file', async () => {
            const config = {
                ignoredDirectories: ['custom'],
                ignoredFiles: ['ignore.txt']
            };
            await fs.writeFile(
                path.join(testWorkspace, '.copy-project-context.json'),
                JSON.stringify(config)
            );
            await fs.mkdir(path.join(testWorkspace, 'custom'), { recursive: true });
            await fs.writeFile(path.join(testWorkspace, 'ignore.txt'), '');

            const structure = await getProjectStructure(testWorkspace);
            assert.ok(!structure.includes('custom'));
            assert.ok(!structure.includes('ignore.txt'));
        });
    });
});
