export const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export interface ProjectContext {
    files: string[];
    addFile(path: string): boolean;
    removeFile(path: string): boolean;
    clear(): void;
}

export class VSCodeProjectContext implements ProjectContext {
    private readonly _files: Set<string> = new Set();

    get files(): string[] {
        return Array.from(this._files);
    }

    addFile(path: string): boolean {
        if (this._files.has(path)) {
            return false;
        }
        this._files.add(path);
        return true;
    }

    removeFile(path: string): boolean {
        return this._files.delete(path);
    }

    clear(): void {
        this._files.clear();
    }
}
