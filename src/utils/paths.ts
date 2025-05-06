/**
 * @fileoverview Path utility functions
 *
 * This file contains utility functions for working with file paths,
 * such as expanding tilde characters in paths.
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Expands the tilde (~) character in a file path to the user's home directory.
 * This is useful for converting shell-like paths to absolute paths.
 *
 * @param filePath The file path to expand
 * @returns The expanded file path
 *
 * @example
 * // Returns '/home/user/documents' on Linux/Mac or 'C:\Users\user\documents' on Windows
 * expandTildePath('~/documents');
 */
export function expandTildePath(filePath: string): string {
  if (filePath && (filePath.startsWith('~/') || filePath === '~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}
