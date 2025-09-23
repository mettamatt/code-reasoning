/**
 * @fileoverview Central configuration constants for code-reasoning
 *
 * This file defines:
 * 1. Filesystem paths for components that need filesystem access (prompts)
 * 2. Default application constants
 *
 * Note: The main configuration system is in-memory only and doesn't use
 * filesystem persistence for configuration values. The filesystem paths
 * defined here are only used for prompt-related functionality.
 */

import path from 'path';
import os from 'os';

// Filesystem paths for prompt-related functionality
export const USER_HOME = os.homedir();
export const CONFIG_DIR = path.join(USER_HOME, '.code-reasoning');
export const PROMPT_VALUES_FILE = path.join(CONFIG_DIR, 'prompt_values.json');
export const CUSTOM_PROMPTS_DIR = path.join(CONFIG_DIR, 'prompts');

export interface ConfigPaths {
  configDir: string;
  promptFile: string;
  customPromptDir: string;
}

export const PATHS: ConfigPaths = Object.freeze({
  configDir: CONFIG_DIR,
  promptFile: PROMPT_VALUES_FILE,
  customPromptDir: CUSTOM_PROMPTS_DIR,
});
