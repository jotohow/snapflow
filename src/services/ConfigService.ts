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

export class ConfigService {
  constructor(private cwd: string) {}

  /**
   * Load API key from file and set environment variable
   */
  loadApiKey(): string | undefined {
    const apiKeyPath = this.getApiKeyPath();

    try {
      if (fs.existsSync(apiKeyPath)) {
        const content = fs.readFileSync(apiKeyPath, 'utf-8');
        const match = content.match(/OPENAI_API_KEY=([^\s]+)/);

        if (match) {
          const apiKey = match[1];
          // Set it in the environment
          process.env.OPENAI_API_KEY = apiKey;
          return apiKey;
        }
      }
    } catch (error) {
      console.error('❌ Failed to load API key:', error);
    }

    return undefined;
  }

  /**
   * Refresh API key from file (useful for dynamic reload)
   */
  refreshApiKey(): string | undefined {
    // Clear existing environment variable
    delete process.env.OPENAI_API_KEY;
    return this.loadApiKey();
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

      // Create api_key file if it doesn't exist
      const apiKeyPath = this.getApiKeyPath();
      if (!fs.existsSync(apiKeyPath)) {
        fs.writeFileSync(apiKeyPath, '', 'utf-8');
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
      this.getApiKeyPath(),
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

    const apiKeyPath = this.getApiKeyPath();
    if (!fs.existsSync(apiKeyPath)) {
      warnings.push('api_key file does not exist (will be created)');
    } else {
      // Check if API key is actually configured
      const apiKey = this.loadApiKey();
      if (!apiKey) {
        issues.push('API key file exists but no valid OPENAI_API_KEY found');
      }
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
   * Save API key to file
   */
  async saveApiKey(apiKey: string): Promise<void> {
    try {
      const apiKeyPath = this.getApiKeyPath();
      const content = `OPENAI_API_KEY=${apiKey}`;
      fs.writeFileSync(apiKeyPath, content, 'utf-8');

      // Reload the API key immediately
      this.refreshApiKey();
    } catch (error) {
      console.error('❌ Failed to save API key:', error);
      throw error;
    }
  }

  /**
   * Check if API key is configured and valid
   */
  hasValidApiKey(): boolean {
    const apiKey = this.loadApiKey();
    return !!apiKey && apiKey.length > 0;
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
