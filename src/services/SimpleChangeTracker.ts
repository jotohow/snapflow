import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IgnorePatterns } from './IgnorePatterns';

export interface FileState {
  content: string;
  lines: string[];
  timestamp: number;
  dirtyLines: Set<number>;
}

export interface ChangeSummary {
  filePath: string;
  startTime: number;
  endTime: number;
  startLine: number;
  endLine: number;
  before: string;
  after: string;
  changedLines: number[];
}

export class SimpleChangeTracker {
  private fileStates = new Map<string, FileState>();
  private cwd: string;
  private changeLogPath: string;
  private ignorePatterns: IgnorePatterns;

  constructor(cwd: string) {
    this.cwd = cwd;
    this.changeLogPath = path.join(cwd, '.snapflow', 'changelog.jsonl');
    this.ignorePatterns = new IgnorePatterns(cwd);
    this.ensureChangeLogExists();
    // Silent initialization
  }

  /**
   * Start tracking changes for a file
   */
  startTracking(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ SimpleChangeTracker: File not found: ${filePath}`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      this.fileStates.set(filePath, {
        content: content,
        lines: lines,
        timestamp: Date.now(),
        dirtyLines: new Set<number>(),
      });

      // Silent start
    } catch (error) {
      console.error(
        `❌ SimpleChangeTracker: Failed to start tracking ${filePath}:`,
        error
      );
    }
  }

  /**
   * Record a change and mark affected lines as dirty
   */
  recordChange(
    document: vscode.TextDocument,
    change: vscode.TextDocumentContentChangeEvent
  ): void {
    const filePath = document.uri.fsPath;
    const fileName = path.basename(filePath);

    // Check if file should be ignored
    if (
      this.ignorePatterns.shouldIgnore(filePath) ||
      document.fileName === 'changelog.jsonl' ||
      document.fileName === 'snaplog.jsonl'
    ) {
      console.log(
        `🚫 SimpleChangeTracker: Ignoring changes in ${fileName} (file is ignored)`
      );
      return;
    }

    // Get or create file state
    let fileState = this.fileStates.get(filePath);
    if (!fileState) {
      console.log(
        `🆕 SimpleChangeTracker: Auto-starting tracking for ${fileName}`
      );
      // Auto-start tracking if not already tracking
      this.startTracking(filePath);
      fileState = this.fileStates.get(filePath);
      if (!fileState) return;
    }

    // Mark the affected lines as dirty
    const startLine = change.range.start.line;
    const endLine = change.range.end.line;

    for (let i = startLine; i <= endLine; i++) {
      fileState.dirtyLines.add(i);
    }
  }

  /**
   * Stop tracking a file and return change summary if any changes occurred
   */
  stopTracking(filePath: string): ChangeSummary | null {
    const fileState = this.fileStates.get(filePath);
    if (!fileState) {
      console.log(
        `ℹ️ SimpleChangeTracker: No file state found for ${path.basename(filePath)}`
      );
      return null;
    }

    try {
      // Silent stop

      // Check if file still exists
      if (!fs.existsSync(filePath)) {
        console.log(
          `⚠️ SimpleChangeTracker: File deleted: ${path.basename(filePath)}`
        );
        this.fileStates.delete(filePath);
        return null;
      }

      const currentContent = fs.readFileSync(filePath, 'utf8');
      const currentLines = currentContent.split('\n');
      // Check if any lines were modified
      if (fileState.dirtyLines.size === 0) {
        this.fileStates.delete(filePath);
        return null;
      }

      // Find the range of dirty lines
      const dirtyLines = Array.from(fileState.dirtyLines).sort((a, b) => a - b);
      const firstDirtyLine = dirtyLines[0];
      const lastDirtyLine = dirtyLines[dirtyLines.length - 1];

      // Extract the relevant sections (with some context)
      const contextLines = 2;
      const startLine = Math.max(0, firstDirtyLine - contextLines);
      const endLine = Math.min(
        currentLines.length - 1,
        lastDirtyLine + contextLines
      );

      const beforeSection = fileState.lines
        .slice(startLine, endLine + 1)
        .join('\n');
      const afterSection = currentLines
        .slice(startLine, endLine + 1)
        .join('\n');

      const changeSummary: ChangeSummary = {
        filePath,
        startTime: fileState.timestamp,
        endTime: Date.now(),
        startLine: startLine,
        endLine: endLine,
        before: beforeSection,
        after: afterSection,
        changedLines: dirtyLines,
      };

      // Save to disk
      this.saveChangeSummary(changeSummary);

      // Clean up
      this.fileStates.delete(filePath);

      console.log(
        `📝 File saved: ${path.basename(filePath)}, changed lines:`,
        dirtyLines
      );

      return changeSummary;
    } catch (error) {
      console.error(
        `❌ SimpleChangeTracker: Failed to stop tracking ${path.basename(filePath)}:`,
        error
      );
      this.fileStates.delete(filePath);
      return null;
    }
  }

  /**
   * Stop tracking all files and return all change summaries
   */
  stopTrackingAll(): ChangeSummary[] {
    const filePaths = Array.from(this.fileStates.keys());
    // Silent stop

    const summaries: ChangeSummary[] = [];

    filePaths.forEach(filePath => {
      const summary = this.stopTracking(filePath);
      if (summary) {
        summaries.push(summary);
      }
    });

    // Silent completion
    return summaries;
  }

  /**
   * Get recent changes from disk
   */
  getRecentChanges(limit: number = 100): ChangeSummary[] {
    try {
      if (!fs.existsSync(this.changeLogPath)) {
        return [];
      }

      const content = fs.readFileSync(this.changeLogPath, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.length > 0);

      // Take last N lines
      const recentLines = lines.slice(-limit);

      return recentLines
        .map(line => {
          try {
            return JSON.parse(line) as ChangeSummary;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ChangeSummary[];
    } catch (error) {
      console.error(
        '❌ SimpleChangeTracker: Failed to load recent changes:',
        error
      );
      return [];
    }
  }

  /**
   * Get formatted recent changes for AI prompts
   */
  getFormattedRecentChanges(limit: number = 100): string {
    const changes = this.getRecentChanges(limit);

    if (changes.length === 0) {
      return 'No recent changes found.';
    }

    // Sort by timestamp (most recent first)
    const sortedChanges = changes.sort((a, b) => b.endTime - a.endTime);

    // Format each change for the prompt
    const formattedChanges = sortedChanges.map((change, index) => {
      const timeAgo = this.getTimeAgo(change.endTime);
      const fileName = path.basename(change.filePath);

      return `[${index + 1}] File: ${fileName}, Path: ${change.filePath}, Lines: ${change.startLine}-${change.endLine}, Time: ${timeAgo}
Changed Lines: ${change.changedLines.join(', ')}
Before: ${JSON.stringify(change.before)}
After: ${JSON.stringify(change.after)}`;
    });

    return formattedChanges.join('\n\n');
  }

  /**
   * Get current code at specific lines in a file (for webview display)
   */
  getCurrentCodeAtLines(
    filePath: string,
    startLine: number,
    endLine: number,
    surroundingLines: number = 3
  ): string {
    try {
      if (!fs.existsSync(filePath)) {
        return `File not found: ${filePath}`;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      const actualStartLine = Math.max(0, startLine - surroundingLines);
      const actualEndLine = Math.min(
        lines.length - 1,
        endLine + surroundingLines
      );

      return lines.slice(actualStartLine, actualEndLine + 1).join('\n');
    } catch (error) {
      console.error(
        '❌ SimpleChangeTracker: Failed to read current file content:',
        error
      );
      return `Error reading file: ${error}`;
    }
  }

  /**
   * Clean up old changes (keep last N days)
   */
  cleanupOldChanges(daysToKeep: number = 30): void {
    try {
      const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      const allChanges = this.getRecentChanges();
      const recentChanges = allChanges.filter(
        change => change.endTime >= cutoffTime
      );

      // Rewrite the file with only recent changes
      const content =
        recentChanges.map(change => JSON.stringify(change)).join('\n') + '\n';
      fs.writeFileSync(this.changeLogPath, content, 'utf8');

      // Silent cleanup
    } catch (error) {
      console.error(
        '❌ SimpleChangeTracker: Failed to cleanup old changes:',
        error
      );
    }
  }

  // Private helper methods

  private ensureChangeLogExists(): void {
    const dir = path.dirname(this.changeLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.changeLogPath)) {
      fs.writeFileSync(this.changeLogPath, '', 'utf8');
    }
  }

  private saveChangeSummary(summary: ChangeSummary): void {
    try {
      const entryLine = JSON.stringify(summary) + '\n';
      fs.appendFileSync(this.changeLogPath, entryLine, 'utf8');
      console.log(
        `💾 SimpleChangeTracker: Saved change summary to disk for ${path.basename(summary.filePath)}`
      );
    } catch (error) {
      console.error(
        '❌ SimpleChangeTracker: Failed to save change summary:',
        error
      );
    }
  }

  private getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffMins < 1) {
      return `${diffSecs} seconds ago`;
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hours ago`;
    }
  }
}
