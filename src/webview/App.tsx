import React, { useState, useEffect, useRef } from 'react';
import { ResponseViewer } from './components/ResponseViewer';

interface Message {
  command: string;
  content?: string;
  data?: any;
  filePath?: string;
  startLine?: number;
  endLine?: number;
}

declare const acquireVsCodeApi: () => any;

export const App: React.FC = () => {
  const [response, setResponse] = useState<string>('');
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const vscodeRef = useRef<any>(null);

  // Get VS Code API instance
  const getVsCode = () => {
    if (!vscodeRef.current) {
      vscodeRef.current = acquireVsCodeApi();
    }
    return vscodeRef.current;
  };

  useEffect(() => {
    console.log(
      '🔍 React App: Component mounted, requesting current response data'
    );

    const vscode = getVsCode();

    // Request current response data when component mounts
    vscode.postMessage({ command: 'getCurrentResponse' });

    // Listen for messages from the VS Code extension
    const handleMessage = (event: MessageEvent) => {
      const message: Message = event.data;

      switch (message.command) {
        case 'currentResponse':
          if (message.content) {
            setResponse(message.content);
            setTimestamp(new Date());
          }
          break;
        case 'updateResponse':
          if (message.content) {
            setResponse(message.content);
            setTimestamp(new Date());
          }
          break;
        case 'openFile':
          // Handle file opening from webview
          if (message.filePath && message.startLine !== undefined) {
            const vscode = getVsCode();
            vscode.postMessage({
              command: 'openFile',
              filePath: message.filePath,
              startLine: message.startLine,
              endLine: message.endLine,
            });
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]">
      <div className="container mx-auto p-6">
        <div className="mb-6 border-b border-[var(--vscode-panel-border)] pb-4">
          <h1 className="text-3xl font-bold text-[var(--vscode-textLink-foreground)] mb-2 text-center">
            <i className="codicon codicon-sync"></i> SnapFlow
          </h1>
          <p className="text-sm text-[var(--vscode-descriptionForeground)]">
            {timestamp.toLocaleString()}
          </p>
        </div>

        <ResponseViewer response={response} vscode={getVsCode()} />
      </div>
    </div>
  );
};
