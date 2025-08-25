import readLastNJsonl from './utils';
import {
  ConfigService,
  AIProvider,
  OpenAIProvider,
  anthropicProvider,
  SimpleChangeTracker,
} from '../services';

// Type definitions
interface SnapFlowComment {
  type: string;
  text: string;
}

interface SessionEntry {
  branch?: string;
  last_commit?: string;
  summary?: string;
  broken?: string;
  uncertain?: string;
  next_step?: string;
  next_step_day?: string;
  comments?: SnapFlowComment[];
}

interface ResumeResponse {
  summary: string;
  reminders: string[];
  recent_comments: SnapFlowComment[];
  nudge: string | null;
}

// Updated interface to match OpenAI chat message format
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  systemContent?: string;
}

/**
 * Generate an enhanced resume using AI based on ChangeTracker data
 */
async function enhancedPromptForResume(
  cwd: string = '',
  provider: string = 'anthropic',
  model: string = ''
): Promise<string> {
  try {
    const configService = new ConfigService(cwd);
    let aiProvider: AIProvider;
    if (provider == 'anthropic') {
      aiProvider = new anthropicProvider();
    } else {
      aiProvider = new OpenAIProvider();
    }

    //Get the last 100 ChangeSummaries from SimpleChangeTracker
    const simpleChangeTracker = new SimpleChangeTracker(cwd);
    const formattedChanges = simpleChangeTracker.getFormattedRecentChanges(100);

    console.log(
      '🔍 Enhanced Resume: Got formatted changes:',
      formattedChanges.substring(0, 200) + '...'
    );

    // Check if we have any changes
    if (formattedChanges === 'No recent changes found.') {
      console.log(
        '🔍 Enhanced Resume: No changes found, returning fallback response'
      );
      return JSON.stringify({
        summary: 'No recent coding activity detected',
        tasks: [],
        fileRelationships: [],
        nextSteps: [
          {
            action: 'Start coding',
            file: 'any file',
            lines: [1, 1],
            description:
              'Begin working on your project to generate activity data',
          },
        ],
      });
    }

    // Create the enhanced prompt
    const enhancedPrompt = getEnhancedSystemPrompt();
    const prompt = enhancedPrompt + '\n\n' + formattedChanges;

    console.log(
      '🔍 Enhanced Resume: Sending prompt to AI (first 500 chars):',
      prompt.substring(0, 500) + '...'
    );

    const response = await aiProvider.generateResume(prompt, model);
    console.log(
      '🔍 Enhanced Resume: Got AI response:',
      response.substring(0, 200) + '...'
    );

    // Clean the response by removing markdown code block markers
    let cleanedResponse = response;
    if (response.includes('```json')) {
      cleanedResponse = response
        .replace(/```json\n?/, '')
        .replace(/```\n?$/, '');
      console.log(
        '🔍 Enhanced Resume: Cleaned response (removed markdown):',
        cleanedResponse.substring(0, 200) + '...'
      );
    }

    return cleanedResponse;
  } catch (error) {
    console.error('❌ Error in enhancedPromptForResume:', error);
    throw error;
  }
}

/**
 * Get the enhanced system prompt for ChangeTracker-based resume
 */
function getEnhancedSystemPrompt(): string {
  return `
  You are helping a developer resume their workflow. Based on their recent coding activity, provide specific, actionable reminders of what they were working on.

IMPORTANT INSTRUCTIONS:
- Analyze changes in chronological order (most recent first)
- Pay attention to file names and relationships - developers often work on related features across multiple files
- Group related work even if it spans different files
- Focus on the most recent and significant changes
- Provide specific file locations and line numbers

OUTPUT FORMAT:
Return your response as valid JSON with this structure:

{
  "summary": "Brief description of current work",
  "tasks": [
    {
      "file": "page.jsx",
      "filePath": "/path/to/file",
      "lines": [23, 23],
      "task": "Adding new functionality to the page",
      "context": "You were adding a comment and new code below the closing tags",
      "timestamp": "30 seconds ago",
      "changes": 1,
      "priority": "high"
    },
    {
      "file": "auth.ts",
      "filePath": "/path/to/file",
      "lines": [45, 48],
      "task": "Implementing email validation function",
      "context": "Replaced placeholder function with proper regex validation",
      "timestamp": "1 minute ago",
      "changes": 12,
      "priority": "medium"
    }
  ],
  "fileRelationships": [
    {
      "type": "authentication",
      "files": ["auth.ts", "page.jsx"],
      "description": "Working on user input validation across authentication components"
    }
  ],
  "nextSteps": [
    {
      "action": "Continue working on new functionality",
      "file": "page.jsx",
      "lines": [23, 25],
      "description": "Complete the new feature you were adding below the closing tags"
    }
  ]
}

Return ONLY valid JSON, no additional text or formatting.`;
}

export {
  enhancedPromptForResume,
  type SessionEntry,
  type ResumeResponse,
  type SnapFlowComment,
  type ChatMessage,
};
