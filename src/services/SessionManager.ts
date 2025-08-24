import * as fs from 'fs';
import * as path from 'path';

export interface SnapFlowComment {
  type: string;
  text: string;
}

export interface SessionEntry {
  timestamp: string;
  branch?: string;
  last_commit?: string;
  files?: string[];
  diff?: string;
  comments?: SnapFlowComment[];
}

export interface GitData {
  branch: string;
  lastCommit: string;
  diff: string;
  files: string[];
}

export class SessionManager {
  constructor(private cwd: string) {}

  /**
   * Save a new session with the provided git data
   */
  async saveSession(gitData: GitData): Promise<void> {
    try {
      await this.ensureSnapflowDir();

      const entry = this.buildSessionEntry(gitData);
      await this.writeToSnaplog(entry);

      console.log('✅ Session saved successfully');
    } catch (error) {
      console.error('❌ Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Build a session entry from git data
   */
  private buildSessionEntry(gitData: GitData): SessionEntry {
    const diff = this.truncateDiff(gitData.diff, 30);
    // const comments = this.extractSnapflowComments(gitData.diff);

    return {
      timestamp: new Date().toISOString(),
      branch: gitData.branch,
      last_commit: gitData.lastCommit,
      files: gitData.files,
      diff,
      // comments,
    };
  }

  /**
   * Ensure the .snapflow directory exists
   */
  private async ensureSnapflowDir(): Promise<void> {
    const dir = path.join(this.cwd, '.snapflow');

    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.error('❌ Failed to create directory:', error);
      throw error;
    }
  }

  /**
   * Write session entry to snaplog.jsonl
   */
  private async writeToSnaplog(entry: SessionEntry): Promise<void> {
    const logPath = path.join(this.cwd, '.snapflow', 'snaplog.jsonl');
    const entryLine = JSON.stringify(entry) + '\n';

    fs.appendFileSync(logPath, entryLine, 'utf8');
  }

  /**
   * Truncate diff text to specified number of lines
   */
  private truncateDiff(text: string, maxLines: number = 30): string {
    const lines = text.trim().split('\n');
    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join('\n') + '\n... [truncated]';
    }
    return text;
  }

  /**
   * Extract SnapFlow comments from diff text
   */
  private extractSnapflowComments(diff: string): SnapFlowComment[] {
    const pattern = /#\s*SNAPFLOW(?:\s+(\w+))?:?\s*(.+)/g;
    const comments: SnapFlowComment[] = [];
    let match;

    while ((match = pattern.exec(diff)) !== null) {
      const rawType = match[1];
      const commentType = rawType ? rawType.toUpperCase() : 'UNKNOWN';
      const text = match[2].trim();
      comments.push({ type: commentType, text });
    }

    return comments;
  }
}
