import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';

export class IgnorePatterns {
  private patterns: string[] = [];
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
    this.loadIgnorePatterns();
  }

  /**
   * Load ignore patterns from .snapflowignore file
   */
  private loadIgnorePatterns(): void {
    const ignoreFilePath = path.join(this.cwd, '.snapflow', '.snapflowignore');

    try {
      if (fs.existsSync(ignoreFilePath)) {
        const content = fs.readFileSync(ignoreFilePath, 'utf8');
        this.patterns = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('#'))
          .map(pattern => this.normalizePattern(pattern));

        console.log(
          `📁 IgnorePatterns: Loaded ${this.patterns.length} ignore patterns`
        );
      } else {
        // Create the .snapflowignore file with default patterns
        this.createIgnoreFile(ignoreFilePath);
        this.patterns = this.getDefaultPatterns();
        console.log(
          '📁 IgnorePatterns: Created .snapflowignore file with default patterns'
        );
      }
    } catch (error) {
      console.error(
        '❌ IgnorePatterns: Failed to load ignore patterns:',
        error
      );
      this.patterns = this.getDefaultPatterns();
    }
  }

  /**
   * Get default ignore patterns
   */
  private getDefaultPatterns(): string[] {
    return [
      '.env*',
      '.snapflow/',
      '.snapflow/*',
      '.snapflowignore',
      'changelog.jsonl',
      'snaplog.jsonl',
      '*.jsonl',
      'node_modules/',
      'dist/',
      'build/',
      'out/',
      '*.min.js',
      '*.min.css',
      '*.log',
      '*.tmp',
      '*.temp',
      '.DS_Store',
      'Thumbs.db',
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',
      '*~',
      '.git/',
      'coverage/',
      '*.lcov',
      '.nyc_output/',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '*.vsix',
      'webpack.config.js',
      'tsconfig.json',
      'tailwind.config.js',
      'postcss.config.js',
      'eslint.config.mjs',
    ];
  }

  /**
   * Normalize a pattern for cross-platform compatibility
   */
  private normalizePattern(pattern: string): string {
    // Convert Windows backslashes to forward slashes
    return pattern.replace(/\\/g, '/');
  }

  /**
   * Check if a file should be ignored
   */
  shouldIgnore(filePath: string): boolean {
    // Convert to relative path from workspace root
    const relativePath = path.relative(this.cwd, filePath).replace(/\\/g, '/');

    // Check against all patterns
    for (const pattern of this.patterns) {
      if (minimatch(relativePath, pattern)) {
        console.log(
          `🚫 IgnorePatterns: Ignoring ${relativePath} (matches pattern: ${pattern})`
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a file should be ignored by its name only
   */
  shouldIgnoreByFileName(fileName: string): boolean {
    // Check against patterns that don't contain path separators
    for (const pattern of this.patterns) {
      if (!pattern.includes('/') && !pattern.includes('\\')) {
        if (minimatch(fileName, pattern)) {
          console.log(
            `🚫 IgnorePatterns: Ignoring file ${fileName} (matches pattern: ${pattern})`
          );
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get all loaded ignore patterns
   */
  getPatterns(): string[] {
    return [...this.patterns];
  }

  /**
   * Reload ignore patterns from file
   */
  reload(): void {
    this.loadIgnorePatterns();
  }

  /**
   * Add a custom ignore pattern
   */
  addPattern(pattern: string): void {
    const normalizedPattern = this.normalizePattern(pattern);
    if (!this.patterns.includes(normalizedPattern)) {
      this.patterns.push(normalizedPattern);
      console.log(`📁 IgnorePatterns: Added custom pattern: ${pattern}`);
    }
  }

  /**
   * Remove a custom ignore pattern
   */
  removePattern(pattern: string): void {
    const normalizedPattern = this.normalizePattern(pattern);
    const index = this.patterns.indexOf(normalizedPattern);
    if (index > -1) {
      this.patterns.splice(index, 1);
      console.log(`📁 IgnorePatterns: Removed pattern: ${pattern}`);
    }
  }

  /**
   * Create the .snapflowignore file with default patterns
   */
  private createIgnoreFile(filePath: string): void {
    try {
      // Ensure the .snapflow directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Create the default ignore file content
      const defaultContent = this.getDefaultIgnoreFileContent();

      // Write the file
      fs.writeFileSync(filePath, defaultContent, 'utf8');

      console.log(
        `📁 IgnorePatterns: Created .snapflowignore file at ${filePath}`
      );
    } catch (error) {
      console.error(
        `❌ IgnorePatterns: Failed to create .snapflowignore file:`,
        error
      );
    }
  }

  /**
   * Get the default content for the .snapflowignore file
   */
  private getDefaultIgnoreFileContent(): string {
    return `# SnapFlow Ignore File
# Files and folders that should not be tracked for development context

# Environment and configuration files
.env
.env.local
.env.development
.env.test
.env.production
.env.*.local

# SnapFlow's own data - CRITICAL to prevent recursive loops
.snapflow/
.snapflow/*
.snapflowignore
changelog.jsonl
snaplog.jsonl
*.jsonl

# Dependencies and build artifacts
node_modules/
dist/
build/
out/
*.min.js
*.min.css

# Logs and temporary files
*.log
*.tmp
*.temp
.DS_Store
Thumbs.db

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# Git and version control
.git/
.gitignore

# Test coverage and reports
coverage/
*.lcov
.nyc_output/

# Package manager files
package-lock.json
yarn.lock
pnpm-lock.yaml

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Extension build files
*.vsix
webpack.config.js
tsconfig.json
tailwind.config.js
postcss.config.js
eslint.config.mjs
`;
  }
}
