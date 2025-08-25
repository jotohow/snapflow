import * as fs from 'fs';
import * as path from 'path';

export interface ConfigValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

const DEFAULT_PROMPT = `
You help a developer resume work after a break by summarising recent git activity.

INPUT
You will receive an array "logs". Each element has:
- timestamp: ISO string
- branch: git branch
- last_commit: commit title and hash
- files: array of file paths
- diff: full unified git diff text for that session
- comments: free text notes (may be empty)

TASK
1) For each log, produce a micro-summary (1–2 sentences) and 1–3 concrete next steps. Return these in JSON.
2) Produce one final resume as plain text, formatted with the following sections and style:

Recent Work: You were working on [brief description of main focus]

What you were doing:
• [specifics of changes, with file/function names where possible]

Next Steps:
• [up to 3 concrete next actions]

Context: [branch, last commit, or other key details]

RULES
- Use ONLY information in the logs. Do not invent tasks.
- Be specific: mention filenames, functions, commands, or config keys.
- Prefer user-visible or behavioural changes over formatting.
- If all changes are trivial, set one_liner to "No meaningful code changes detected."
- If a log is too sparse, set one_liner to "Insufficient context."
- British English. Plain text only. No Markdown headings (#) or extra formatting beyond bullets (•).
- Keep final resume ≤ 10 lines.

OUTPUT FORMAT
{
  "per_log": [
    {
      "timestamp": "<from input>",
      "one_liner": "<≤20 words>",
      "details": ["<up to 3 bullets>"],
      "next_steps": ["<up to 3 concrete items>"]
    }
  ],
  "final_resume": "Recent Work: You were working on... \\n\\nWhat you were doing:\\n• ...\\n• ...\\n\\nNext Steps:\\n• ...\\n• ...\\n\\nContext: ..."
}

Now process these logs:
`;

const ENV_KEY_VALS: { [key: string]: string } = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

interface Config {
  provider: string;
  model: string;
  providers: {
    [key: string]: {
      apiKey: string;
      baseUrl: string;
    };
  };
}

export class ConfigService {
  _config: Config | undefined;

  constructor(private cwd: string) {}

  loadApiKey(): string | undefined {
    let config = this.loadConfig();

    Object.keys(config?.providers || {}).forEach(provider => {
      let apiKey = config?.providers[provider].apiKey;
      let apiKeyValName = ENV_KEY_VALS[provider];

      if (apiKey) {
        process.env[apiKeyValName] = apiKey;
      }
    });

    return undefined;
  }

  loadConfig(): Config | undefined {
    const configPath = this.getConfigPath();
    const content = fs.readFileSync(configPath, 'utf-8');
    const data = JSON.parse(content);
    this._config = data;

    return this._config;
  }

  /**
   * Refresh API key from file (useful for dynamic reload)
   */
  refreshApiKey(): null {
    // Clear existing environment variable
    delete process.env.OPENAI_API_KEY;
    this.loadApiKey();
    return null;
  }

  /**
   * Ensure workspace is properly set up with all required files
   */
  async ensureWorkspaceSetup(): Promise<void> {
    const snapflowDir = this.getSnapflowDir();

    try {
      // Create .snapflow directory if it doesn't exist
      if (!fs.existsSync(snapflowDir)) {
        fs.mkdirSync(snapflowDir, { recursive: true });
      }

      // Create prompt.txt if it doesn't exist
      const promptPath = this.getPromptPath();
      if (!fs.existsSync(promptPath)) {
        fs.writeFileSync(promptPath, DEFAULT_PROMPT, 'utf-8');
      }

      // Create empty snaplog.jsonl if it doesn't exist
      const logPath = this.getSnaplogPath();
      if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '', 'utf-8');
      }

      const defaultConfig = `
{
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "providers": {
    "openai": {
      "apiKey": "",
      "baseUrl": "https://api.openai.com/v1"
    }
  }
}
`;
      const configPath = this.getConfigPath();
      if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, defaultConfig, 'utf-8');
      }
    } catch (error) {
      console.error('❌ Failed to set up workspace:', error);
      throw error;
    }
  }

  /**
   * Check if workspace is properly configured
   */
  isWorkspaceConfigured(): boolean {
    const requiredPaths = [
      this.getSnapflowDir(),
      this.getPromptPath(),
      this.getSnaplogPath(),
      this.getConfigPath(),
    ];

    return requiredPaths.every(path => fs.existsSync(path));
  }

  /**
   * Get system prompt from file
   */
  getSystemPrompt(): string {
    try {
      // Ensure files exist before trying to read
      this.ensureWorkspaceSetup();

      const promptPath = this.getPromptPath();
      return fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
      console.error('❌ Failed to read system prompt, using default:', error);
      return DEFAULT_PROMPT;
    }
  }

  /**
   * Update system prompt in file
   */
  async updateSystemPrompt(prompt: string): Promise<void> {
    try {
      const promptPath = this.getPromptPath();
      fs.writeFileSync(promptPath, prompt, 'utf-8');
    } catch (error) {
      console.error('❌ Failed to update system prompt:', error);
      throw error;
    }
  }

  /**
   * Get .snapflow directory path
   */
  getSnapflowDir(): string {
    return path.join(this.cwd, '.snapflow');
  }

  /**
   * Get API key file path
   */
  getApiKeyPath(): string {
    return path.join(this.getSnapflowDir(), 'api_key');
  }

  /**
   * Get prompt file path
   */
  getPromptPath(): string {
    return path.join(this.getSnapflowDir(), 'prompt.txt');
  }

  /**
   * Get snaplog file path
   */
  getSnaplogPath(): string {
    return path.join(this.getSnapflowDir(), 'snaplog.jsonl');
  }

  getConfigPath(): string {
    return path.join(this.getSnapflowDir(), 'config.json');
  }

  /**
   * Validate configuration and return detailed results
   */
  validateConfiguration(): ConfigValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check if workspace directory exists
    if (!fs.existsSync(this.cwd)) {
      issues.push('Workspace directory does not exist');
      return { isValid: false, issues, warnings };
    }

    // Check .snapflow directory
    const snapflowDir = this.getSnapflowDir();
    if (!fs.existsSync(snapflowDir)) {
      warnings.push('.snapflow directory does not exist (will be created)');
    }

    // Check required files
    const promptPath = this.getPromptPath();
    if (!fs.existsSync(promptPath)) {
      warnings.push('prompt.txt does not exist (default will be created)');
    }

    // Check if API key is actually configured
    const apiKeyLoaded = this.hasValidApiKey();
    if (!apiKeyLoaded) {
      issues.push('API key file exists but no valid OPENAI_API_KEY found');
    }

    const logPath = this.getSnaplogPath();
    if (!fs.existsSync(logPath)) {
      warnings.push('snaplog.jsonl does not exist (will be created)');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Check if API key is configured and valid
   */
  hasValidApiKey(): boolean {
    let config = this.loadConfig();

    let keys = Object.keys(config?.providers || {}).map(provider => {
      // Check that the API key for that provider is defined in env
      let apiKeyValName = ENV_KEY_VALS[provider];
      return process.env[apiKeyValName];
    });

    return keys.every(key => !!key);
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): object {
    return {
      cwd: this.cwd,
      snapflowDir: this.getSnapflowDir(),
      hasApiKey: this.hasValidApiKey(),
      isConfigured: this.isWorkspaceConfigured(),
      validation: this.validateConfiguration(),
    };
  }
}
