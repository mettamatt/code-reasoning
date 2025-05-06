/**
 * @fileoverview Path utility functions
 *
 * This file contains utility functions for working with file paths,
 * such as expanding tilde characters in paths.
 */

import * as path from 'path';
import * as os from 'os';

import * as fs from 'fs';

/**
 * Expands the tilde (~) character in a file path to the user's home directory.
 * This is useful for converting shell-like paths to absolute paths.
 *
 * @param filePath The file path to expand
 * @param createDir Whether to create the directory if it doesn't exist
 * @returns The expanded file path
 *
 * @example
 * // Returns '/home/user/documents' on Linux/Mac or 'C:\Users\user\documents' on Windows
 * expandTildePath('~/documents');
 */
export function expandTildePath(filePath: string, createDir = false): string {
  let expandedPath = filePath;

  // Expand tilde if present
  if (filePath && (filePath.startsWith('~/') || filePath === '~')) {
    expandedPath = path.join(os.homedir(), filePath.slice(1));
  }

  // Create directory if requested and it doesn't exist
  if (createDir && expandedPath) {
    try {
      if (!fs.existsSync(expandedPath)) {
        fs.mkdirSync(expandedPath, { recursive: true });
        console.error(`Created directory: ${expandedPath}`);
      }
    } catch (err) {
      console.error(`Failed to create directory: ${expandedPath}`, err);
    }
  }

  return expandedPath;
}
