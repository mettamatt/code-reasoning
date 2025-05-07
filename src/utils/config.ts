/**
 * @fileoverview Central configuration constants for code-reasoning
 *
 * This file defines the central configuration paths and defaults used by
 * code-reasoning, ensuring consistent path handling across the application.
 */

import path from 'path';
import os from 'os';

// Use user's home directory for configuration files
export const USER_HOME = os.homedir();
export const CONFIG_DIR = path.join(USER_HOME, '.code-reasoning');

// Paths relative to the config directory
export const PROMPT_VALUES_FILE = path.join(CONFIG_DIR, 'prompt_values.json');
export const CUSTOM_PROMPTS_DIR = path.join(CONFIG_DIR, 'prompts');

// Application defaults
export const DEFAULT_COMMAND_TIMEOUT = 60000; // milliseconds
export const MAX_THOUGHT_LENGTH = 20000;
export const MAX_THOUGHTS = 20;
