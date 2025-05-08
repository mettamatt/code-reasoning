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

// Application defaults (used by the in-memory configuration)
export const MAX_THOUGHT_LENGTH = 20000;
export const MAX_THOUGHTS = 20;
