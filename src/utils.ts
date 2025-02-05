import * as fs from "fs/promises";
import * as path from "path";

export const ignoredDirs = new Set([
  "node_modules",
  "dist",
  "out",
  "build",
  "coverage",
  ".git",
  ".vscode",
  ".idea",
]);

export const ignoredFiles = new Set([
  "README.md",
  "LICENSE",
  "package-lock.json",
  "yarn.lock",
  ".gitignore",
  ".npmignore",
  ".eslintrc.json",
  ".prettierrc",
]);

export async function getProjectStructure(
  workspaceRoot: string
): Promise<string> {
  const rootFolderName = path.basename(workspaceRoot);
  const structure: string[] = [
    "# Project Structure",
    `Name: ${rootFolderName}`,
    "",
  ];

  async function buildTree(dir: string, prefix: string = ""): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const sortedEntries = entries
      .filter((entry) => {
        if (entry.isDirectory() && ignoredDirs.has(entry.name)) {
          return false;
        }
        if (!entry.isDirectory() && ignoredFiles.has(entry.name)) {
          return false;
        }
        return !entry.name.startsWith(".");
      })
      .sort((a, b) => {
        if (a.isDirectory() === b.isDirectory()) {
          return a.name.localeCompare(b.name);
        }
        return a.isDirectory() ? -1 : 1;
      });

    for (const [index, entry] of sortedEntries.entries()) {
      const isLast = index === sortedEntries.length - 1;
      const marker = isLast ? "└──" : "├──";
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      const icon = entry.isDirectory() ? "📁" : "📄";

      structure.push(`${prefix}${marker} ${icon} ${entry.name}`);

      if (entry.isDirectory()) {
        await buildTree(path.join(dir, entry.name), newPrefix);
      }
    }
  }

  await buildTree(workspaceRoot);
  return structure.join("\n");
}

export function detectFileLanguage(filePath: string): string {
  const extensionMap: Record<string, string> = {
    // Web Technologies
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".less": "less",
    ".vue": "vue",
    ".svelte": "svelte",

    // Backend
    ".py": "python",
    ".java": "java",
    ".cs": "csharp",
    ".go": "go",
    ".rb": "ruby",
    ".php": "php",
    ".rs": "rust",
    ".swift": "swift",
    ".kt": "kotlin",

    // Data & Config
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".xml": "xml",
    ".csv": "csv",
    ".env": "shell",
    ".ini": "ini",

    // Documentation
    ".md": "markdown",
    ".mdx": "mdx",
    ".txt": "text",
    ".rst": "rst",

    // Shell Scripts
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".fish": "shell",
    ".ps1": "powershell",
    ".bat": "batch",
    ".cmd": "batch",

    // Database
    ".sql": "sql",
    ".prisma": "prisma",

    // Docker & DevOps
    ".dockerfile": "dockerfile",
    ".dockerignore": "dockerfile",
    ".tf": "hcl",
    ".tfvars": "hcl",
    ".hcl": "hcl",

    // Other
    ".graphql": "graphql",
    ".proto": "protobuf",
  };

  const extension = filePath.toLowerCase().slice(filePath.lastIndexOf("."));

  // Special case for Dockerfile without extension
  if (filePath.toLowerCase().endsWith("dockerfile")) {
    return "dockerfile";
  }

  // Special case for package.json
  if (filePath.toLowerCase().endsWith("package.json")) {
    return "json5";
  }

  return extensionMap[extension] || "plaintext";
}
