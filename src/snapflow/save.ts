import { GitService, SessionManager, type GitData } from '../services';

export async function saveSession(cwd: string): Promise<void> {
  try {
    // Create service instances for this session
    const gitService = new GitService(cwd);
    const sessionManager = new SessionManager(cwd);

    // Gather git data
    const [branch, lastCommit, fullDiff, files] = await Promise.all([
      gitService.getBranch(),
      gitService.getLastCommit(),
      gitService.getDiffFromSnaplog(),
      gitService.getChangedFiles(),
    ]);

    // Prepare git data for session manager
    const gitData: GitData = {
      branch,
      lastCommit,
      diff: fullDiff,
      files,
    };

    // Save session using session manager
    await sessionManager.saveSession(gitData);
  } catch (error) {
    console.error('❌ Failed to save session:', error);
    throw error;
  }
}
