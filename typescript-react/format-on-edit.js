#!/usr/bin/env node

/**
 * Format on Edit Hook
 * Automatically formats edited files using Prettier after Claude makes changes
 *
 * Events: PostToolUse (Edit, Write)
 * Purpose: Ensure consistent code formatting across the codebase
 */

const { execSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");
const path = require("path");

const HOOK_NAME = "format-on-edit";

/**
 * Check if Prettier is available in the project
 */
function hasPrettier() {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (!existsSync(packageJsonPath)) return false;

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const hasPrettierDep =
      packageJson.dependencies?.prettier ||
      packageJson.devDependencies?.prettier;

    return !!hasPrettierDep;
  } catch {
    return false;
  }
}

/**
 * Get the appropriate package manager command
 */
function getPackageManager() {
  if (existsSync(path.join(process.cwd(), "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(process.cwd(), "yarn.lock"))) return "yarn";
  return "npm";
}

/**
 * Format a file using Prettier
 */
function formatFile(filePath) {
  try {
    const pm = getPackageManager();
    const execCommand =
      pm === "pnpm"
        ? `pnpm exec prettier --write "${filePath}"`
        : pm === "yarn"
          ? `yarn prettier --write "${filePath}"`
          : `npx prettier --write "${filePath}"`;

    execSync(execCommand, {
      stdio: "pipe",
      cwd: process.cwd(),
    });

    console.log(`[${HOOK_NAME}] ✓ Formatted: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`[${HOOK_NAME}] ✗ Failed to format ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Check if file should be formatted
 */
function shouldFormat(filePath) {
  // Only format common code files
  const formattableExtensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".css",
    ".scss",
    ".md",
    ".html",
  ];

  const ext = path.extname(filePath).toLowerCase();
  if (!formattableExtensions.includes(ext)) return false;

  // Skip formatting for certain directories
  const skipDirs = ["node_modules", "dist", "build", ".next", "coverage"];
  const normalizedPath = filePath.replace(/\\/g, "/");

  return !skipDirs.some((dir) => normalizedPath.includes(`/${dir}/`));
}

/**
 * Main hook execution
 */
function main() {
  try {
    const input = JSON.parse(readFileSync(0, "utf-8"));
    const { event, toolName, toolInput } = input;

    // Only run on Edit and Write tools
    if (event !== "PostToolUse" || !["Edit", "Write"].includes(toolName)) {
      process.exit(0);
    }

    // Check if Prettier is available
    if (!hasPrettier()) {
      console.log(
        `[${HOOK_NAME}] Prettier not found in project dependencies, skipping format`,
      );
      process.exit(0);
    }

    const filePath = toolInput.file_path;

    // Validate file path
    if (!filePath || !existsSync(filePath)) {
      console.log(`[${HOOK_NAME}] File not found: ${filePath}`);
      process.exit(0);
    }

    // Check if file should be formatted
    if (!shouldFormat(filePath)) {
      console.log(`[${HOOK_NAME}] Skipping format for: ${filePath}`);
      process.exit(0);
    }

    // Format the file
    const success = formatFile(filePath);

    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`[${HOOK_NAME}] Unexpected error:`, error);
    process.exit(1);
  }
}

main();
