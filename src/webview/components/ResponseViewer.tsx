import React from 'react';

interface Task {
  file: string;
  filePath: string;
  lines: [number, number];
  task: string;
  context: string;
  timestamp: string;
  changes: number;
  priority: string;
}

interface FileRelationship {
  type: string;
  files: string[];
  description: string;
}

interface NextStep {
  action: string;
  file: string;
  lines: [number, number];
  description: string;
}

interface EnhancedResponse {
  summary: string;
  tasks: Task[];
  fileRelationships?: FileRelationship[];
  nextSteps?: NextStep[];
}

interface ResponseViewerProps {
  response: string;
  vscode: any;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  vscode,
}) => {
  console.log(
    '🔍 ResponseViewer: Component rendered with response length:',
    response.length
  );

  if (!response) {
    return (
      <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-8 text-center">
        <div className="text-[var(--vscode-descriptionForeground)] text-lg">
          No response content available
        </div>
        <div className="text-[var(--vscode-descriptionForeground)] text-sm mt-2">
          Start a SnapFlow session to see AI-generated summaries
        </div>
      </div>
    );
  }

  // Try to parse as enhanced JSON response
  let parsedResponse: EnhancedResponse | null = null;
  try {
    console.log('🔍 ResponseViewer: Attempting to parse response as JSON');
    console.log(
      '🔍 ResponseViewer: Raw response:',
      response.substring(0, 200) + '...'
    );
    parsedResponse = JSON.parse(response);
    console.log('🔍 ResponseViewer: Successfully parsed JSON:', parsedResponse);
  } catch (error) {
    console.log(
      '🔍 ResponseViewer: Failed to parse JSON, falling back to raw text:',
      error
    );
    // Fall back to raw text display if not JSON
    return (
      <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg overflow-hidden">
        <div className="bg-[var(--vscode-titleBar-activeBackground)] px-4 py-3 border-b border-[var(--vscode-panel-border)]">
          <h3 className="text-sm font-medium text-[var(--vscode-titleBar-activeForeground)]">
            <i className="codicon codicon-symbol-text mr-2"></i>AI Response
            Content
          </h3>
        </div>

        <div className="p-6">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono text-[var(--vscode-editor-foreground)] bg-[var(--vscode-textBlockQuote-background)] p-4 rounded overflow-x-auto">
            {response}
          </pre>
        </div>
      </div>
    );
  }

  // Enhanced JSON response display
  if (!parsedResponse) {
    return null; // This should never happen, but TypeScript needs it
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {parsedResponse.summary && (
        <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4 hover:border-[var(--vscode-focusBorder)] transition-colors">
          <h2 className="text-lg font-semibold text-[var(--vscode-textLink-foreground)] mb-2 flex items-center">
            <i className="codicon codicon-note mr-2"></i> Summary
          </h2>
          <p className="text-[var(--vscode-foreground)]">
            {parsedResponse.summary}
          </p>
        </div>
      )}

      {/* Tasks */}
      {parsedResponse.tasks && parsedResponse.tasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--vscode-textLink-foreground)] flex items-center">
            <i className="codicon codicon-list-ordered mr-2"></i> Recent Tasks
          </h2>
          {parsedResponse.tasks.map((task, index) => (
            <TaskCard key={index} task={task} vscode={vscode} />
          ))}
        </div>
      )}

      {/* File Relationships */}
      {parsedResponse.fileRelationships &&
        parsedResponse.fileRelationships.length > 0 && (
          <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4 hover:border-[var(--vscode-focusBorder)] transition-colors">
            <h2 className="text-lg font-semibold text-[var(--vscode-textLink-foreground)] mb-3 flex items-center">
              <i className="codicon codicon-references mr-2"></i> File
              Relationships
            </h2>
            {parsedResponse.fileRelationships.map((rel, index) => (
              <div key={index} className="mb-3 last:mb-0">
                <div className="font-medium text-[var(--vscode-foreground)] mb-1">
                  {rel.type}
                </div>
                <div className="text-sm text-[var(--vscode-descriptionForeground)]">
                  {rel.description}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Next Steps */}
      {parsedResponse.nextSteps && parsedResponse.nextSteps.length > 0 && (
        <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4 hover:border-[var(--vscode-focusBorder)] transition-colors">
          <h2 className="text-lg font-semibold text-[var(--vscode-textLink-foreground)] mb-3 flex items-center">
            <i className="codicon codicon-arrow-right mr-2"></i> Next Steps
          </h2>
          {parsedResponse.nextSteps.map((step, index) => (
            <div key={index} className="mb-3 last:mb-0">
              <div className="font-medium text-[var(--vscode-foreground)] mb-1">
                {step.action}
              </div>
              <div className="text-sm text-[var(--vscode-descriptionForeground)]">
                {step.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Task Card Component
const TaskCard: React.FC<{ task: Task; vscode: any }> = ({ task, vscode }) => {
  console.log('🔍 TaskCard: Component rendered for task:', task);

  const handleFileClick = () => {
    // Execute VS Code command to open file at specific lines
    if (vscode) {
      const message = {
        command: 'executeCommand',
        commandId: 'snapflow.openFile',
        args: [task.filePath, task.lines[0], task.lines[1]],
      };
      console.log('🔍 TaskCard: Sending message to VS Code:', message);
      console.log('🔍 TaskCard: vscode object:', vscode);
      console.log('🔍 TaskCard: postMessage method:', vscode.postMessage);
      vscode.postMessage(message);
    } else {
      console.error('🔍 TaskCard: vscode API not available');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-[var(--vscode-errorForeground)]';
      case 'medium':
        return 'text-[var(--vscode-warningForeground)]';
      case 'low':
        return 'text-[var(--vscode-notificationsInfoIcon)]';
      default:
        return 'text-[var(--vscode-descriptionForeground)]';
    }
  };

  return (
    <div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4 hover:border-[var(--vscode-focusBorder)] focus-within:border-[var(--vscode-focusBorder)] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-[var(--vscode-foreground)] mb-1">
            {task.task}
          </h3>
          <p className="text-sm text-[var(--vscode-descriptionForeground)] mb-2">
            {task.context}
          </p>
        </div>
        {/* <div
          className={`text-sm font-medium ${getPriorityColor(task.priority)} px-2 py-1 rounded bg-[var(--vscode-badge-background)]`}
        >
          {task.priority}
        </div> */}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-[var(--vscode-descriptionForeground)]">
          {task.timestamp} • {task.changes} changes
        </div>
        <button
          onClick={handleFileClick}
          className="text-[var(--vscode-textLink-foreground)] hover:text-[var(--vscode-textLink-activeForeground)] focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder)] rounded px-2 py-1 flex items-center"
        >
          <i className="codicon codicon-file-code mr-1"></i> {task.file}:
          {task.lines[0]}-{task.lines[1]}
        </button>
      </div>
    </div>
  );
};
