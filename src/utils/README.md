# Configuration System

This directory contains utilities for handling configuration in the code-reasoning project.

## Key Files

### `config.ts`

Contains centralized configuration constants for the entire application:

- `USER_HOME` - The user's home directory
- `CONFIG_DIR` - Central configuration directory (`~/.code-reasoning`)
- `PROMPT_VALUES_FILE` - File for storing prompt argument values
- `CUSTOM_PROMPTS_DIR` - Directory for custom prompt templates
- Various application defaults like timeouts and limits

### `config-manager.ts`

Provides a singleton configuration manager that handles:

- In-memory configuration management
- Simple, type-safe API for accessing configuration values
- Default configuration values

Example usage:

```typescript
import { configManager } from './utils/config-manager.js';

// Initialize configuration (sets up defaults)
await configManager.init();

// Get the full configuration
const config = await configManager.getConfig();

// Get a specific value
const maxThoughts = await configManager.getValue('maxThoughts');

// Update a value
await configManager.setValue('debug', true);

// Update multiple values at once
await configManager.updateConfig({
  debug: true,
  timeoutMs: 120000
});

// Reset to defaults
await configManager.resetConfig();
```

## Configuration Structure

The configuration includes:

- `maxThoughtLength` - Maximum length of a thought in characters
- `timeoutMs` - Timeout for operations in milliseconds 
- `maxThoughts` - Maximum number of thoughts allowed
- `debug` - Enable debug mode
- `promptsEnabled` - Whether prompts capability is enabled
- `customPromptsDir` - Directory for custom prompt templates

## Design Philosophy

The configuration system follows these principles:

1. **Simplicity** - Minimal code with no unnecessary functionality
2. **Centralization** - All configuration constants are defined in one place
3. **Type Safety** - TypeScript interfaces define the configuration structure
4. **Sensible Defaults** - Good default values for all configuration settings
5. **In-Memory First** - Configuration primarily lives in memory for simplicity
