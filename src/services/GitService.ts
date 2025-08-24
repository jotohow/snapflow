import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class GitService {
  constructor(private cwd: string) {}

  /**
   * Get the current git branch name
   */
  async getBranch(): Promise<string> {
    try {
      const { stdout } = await this.executeGitCommand(
        'git rev-parse --abbrev-ref HEAD'
      );
      return stdout.trim();
    } catch (error) {
      console.error('❌ getBranch: Git command failed:', error);
      return 'unknown';
    }
  }

  /**
   * Get the last commit information
   */
  async getLastCommit(): Promise<string> {
    try {
      const { stdout } = await this.executeGitCommand(
        'git log -1 --format="%h %s"'
      );
      return stdout.trim();
    } catch (error) {
      console.error('❌ getLastCommit: Git command failed:', error);
      return 'N/A';
    }
  }

  /**
   * Get git diff from a specific commit to current state
   */
  async getDiff(fromSha: string): Promise<string> {
    try {
      const command = `git diff ${fromSha} -- . ':!.snapflow/'`;
      const { stdout } = await this.executeGitCommand(command);
      return stdout;
    } catch (error) {
      console.error('❌ getDiff: Git command failed:', error);
      return '';
    }
  }

  /**
   * Get list of changed files since last commit
   */
  async getChangedFiles(): Promise<string[]> {
    try {
      const { stdout } = await this.executeGitCommand(
        'git diff --name-only HEAD'
      );
      const files = stdout
        .trim()
        .split('\n')
        .filter(f => f);
      return files;
    } catch (error) {
      console.error('❌ getChangedFiles: Git command failed:', error);
      return [];
    }
  }

  /**
   * Get diff from snaplog or fallback to recent commits
   */
  async getDiffFromSnaplog(nCommitsFallback: number = 3): Promise<string> {
    const logPath = path.join(this.cwd, '.snapflow', 'snaplog.jsonl');

    try {
      // Try to read from snaplog first
      if (fs.existsSync(logPath)) {
        const snaplog = fs.readFileSync(logPath, 'utf-8');
        const lines = snaplog
          .split('\n')
          .filter((line: string) => line.trim() !== '');

        if (lines.length > 0) {
          const lastEntry = JSON.parse(lines[lines.length - 1]);
          if (lastEntry.last_commit) {
            const lastSHA = lastEntry.last_commit.split(' ')[0];
            return await this.getDiff(lastSHA);
          }
        }
      }

      // If we don't have the snaplog, try getting diff to a recent commit, starting from nCommitsFallback
      console.log('Using fallback');
      let commitsOffset = nCommitsFallback;
      let success = false;
      let stdout = '';

      while (commitsOffset >= 0 && !success) {
        try {
          const gitCommand = `git diff HEAD~${commitsOffset} -- . ':!.snapflow/'`;
          const result = await this.executeGitCommand(gitCommand);
          stdout = result.stdout;
          success = true;
          console.log(`Used fallback command: ${gitCommand}`);
        } catch {
          commitsOffset--;
        }
      }

      return stdout;
    } catch (error) {
      console.error('❌ getDiffFromSnaplog: Failed to get diff:', error);
      return '';
    }
  }

  /**
   * Execute a git command and return the result
   */
  private async executeGitCommand(
    command: string
  ): Promise<{ stdout: string; stderr: string }> {
    return execAsync(command, {
      cwd: this.cwd,
      maxBuffer: 1024 * 1024, // 1MB buffer
    });
  }
}
