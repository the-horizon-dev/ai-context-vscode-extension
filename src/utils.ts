import * as fs from "fs/promises";
import { existsSync, readFileSync } from "fs";
import * as path from "path";
import * as vscode from "vscode";

export const defaultIgnoredDirs = [
  "node_modules",
  "dist",
  "out",
  "build",
  "coverage",
  ".git",
  ".vscode",
  ".idea",
];

export const defaultIgnoredFiles = [
  "README.md",
  "LICENSE",
  "package-lock.json",
  "yarn.lock",
  ".gitignore",
  ".npmignore",
  ".eslintrc.json",
  ".prettierrc",
];

export const CONFIG_FILE_NAME = ".copy-project-context.json";

export interface ExtensionConfig {
  ignoredDirectories?: string[];
  ignoredFiles?: string[];
}

export function readConfigFile(workspaceRoot: string): ExtensionConfig {
  try {
    const configPath = path.join(workspaceRoot, CONFIG_FILE_NAME);
    if (!existsSync(configPath)) {
      return {};
    }
    const raw = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ignoredDirectories: Array.isArray(parsed.ignoredDirectories)
        ? parsed.ignoredDirectories
        : [],
      ignoredFiles: Array.isArray(parsed.ignoredFiles)
        ? parsed.ignoredFiles
        : [],
    };
  } catch {
    return {};
  }
}

export function getIgnoredDirs(workspaceRoot?: string): Set<string> {
  const user = vscode.workspace
    .getConfiguration("copyProjectContext")
    .get<string[]>("ignoredDirectories", []);
  const file = workspaceRoot ? readConfigFile(workspaceRoot).ignoredDirectories ?? [] : [];
  return new Set([...defaultIgnoredDirs, ...user, ...file]);
}

export function getIgnoredFiles(workspaceRoot?: string): Set<string> {
  const user = vscode.workspace
    .getConfiguration("copyProjectContext")
    .get<string[]>("ignoredFiles", []);
  const file = workspaceRoot ? readConfigFile(workspaceRoot).ignoredFiles ?? [] : [];
  return new Set([...defaultIgnoredFiles, ...user, ...file]);
}

export interface StructureOptions {
  ignoredDirs?: Set<string>;
  ignoredFiles?: Set<string>;
}

export async function getProjectStructure(
  workspaceRoot: string,
  options: StructureOptions = {}
): Promise<string> {
  const ignoredDirs = options.ignoredDirs ?? getIgnoredDirs(workspaceRoot);
  const ignoredFiles = options.ignoredFiles ?? getIgnoredFiles(workspaceRoot);
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
