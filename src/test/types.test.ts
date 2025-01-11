import * as assert from 'assert';
import { VSCodeProjectContext } from '../types';

suite('VSCodeProjectContext Tests', () => {
    let context: VSCodeProjectContext;

    setup(() => {
        context = new VSCodeProjectContext();
    });

    test('adds files correctly', () => {
        const added = context.addFile('test.ts');
        assert.strictEqual(added, true);
        assert.strictEqual(context.files.length, 1);
    });

    test('prevents duplicate files', () => {
        context.addFile('test.ts');
        const added = context.addFile('test.ts');
        assert.strictEqual(added, false);
        assert.strictEqual(context.files.length, 1);
    });

    test('removes files correctly', () => {
        context.addFile('test.ts');
        const removed = context.removeFile('test.ts');
        assert.strictEqual(removed, true);
        assert.strictEqual(context.files.length, 0);
    });

    test('clear removes all files', () => {
        context.addFile('test1.ts');
        context.addFile('test2.ts');
        context.clear();
        assert.strictEqual(context.files.length, 0);
    });
});
