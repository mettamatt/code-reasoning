/**
 * @fileoverview Configuration manager for code-reasoning server
 *
 * This module provides a singleton configuration manager that handles
 * configuration settings for the code-reasoning server in memory.
 */

/**
 * Structure of the server configuration
 */
export interface CodeReasoningConfig {
  // Server settings
  maxThoughtLength: number;
  timeoutMs: number;
  maxThoughts: number;
  debug: boolean;

  // Prompt-related configuration
  promptsEnabled: boolean;

  // Any additional custom settings
  [key: string]: unknown;
}

/**
 * Singleton config manager for the server
 */
class ConfigManager {
  private config: CodeReasoningConfig;
  private initialized = false;

  constructor() {
    // Initialize with default config
    this.config = this.getDefaultConfig();
  }

  /**
   * Initialize configuration
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // In-memory only configuration, no filesystem operations needed
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize config:', error);
      // Fall back to default config in memory
      this.config = this.getDefaultConfig();
      this.initialized = true;
    }
  }

  /**
   * Create default configuration
   */
  private getDefaultConfig(): CodeReasoningConfig {
    return {
      maxThoughtLength: 20000,
      timeoutMs: 60000,
      maxThoughts: 20,
      debug: false,
      promptsEnabled: true,
    };
  }

  /**
   * Get the entire config
   */
  async getConfig(): Promise<CodeReasoningConfig> {
    await this.init();
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   */
  async getValue<K extends keyof CodeReasoningConfig>(key: K): Promise<CodeReasoningConfig[K]> {
    await this.init();
    return this.config[key];
  }

  /**
   * Set a specific configuration value
   */
  async setValue<K extends keyof CodeReasoningConfig>(
    key: K,
    value: CodeReasoningConfig[K]
  ): Promise<void> {
    await this.init();
    this.config[key] = value;
  }

  /**
   * Update multiple configuration values at once
   */
  async updateConfig(updates: Partial<CodeReasoningConfig>): Promise<CodeReasoningConfig> {
    await this.init();
    this.config = { ...this.config, ...updates };
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<CodeReasoningConfig> {
    this.config = this.getDefaultConfig();
    return { ...this.config };
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
