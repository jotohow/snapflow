import * as vscode from 'vscode';
import { newPromptForResume, enhancedPromptForResume } from './snapflow/resume';
import { saveSession } from './snapflow/save';
import {
  TimerService,
  ConfigService,
  WebviewService,
  SnapFlowWebviewViewProvider,
} from './services';
import { SimpleChangeTracker } from './services/SimpleChangeTracker';

let myStatusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let timerService: TimerService;
let configService: ConfigService;
let webviewService: WebviewService;
let simpleChangeTracker: SimpleChangeTracker;

// Set up what happens on the extension starting
export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  let workspacePath = workspaceFolder?.uri.fsPath || '';

  // Initialize configuration service and set up workspace
  configService = new ConfigService(workspacePath);

  try {
    await configService.ensureWorkspaceSetup();
    const apiKey = configService.loadApiKey();
    if (!apiKey) {
      console.warn('⚠️ No API key found in .snapflow/api_key');
    }
  } catch (error) {
    console.error('❌ Failed to initialize workspace configuration:', error);
  }

  // Check if a workspace folder is open
  if (!vscode.workspace.workspaceFolders?.length) {
    // Still create the status bar item but disable it
    myStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    myStatusBarItem.text = '⏹️ No folder open';
    myStatusBarItem.tooltip = 'Open a folder to use SnapFlow';
    myStatusBarItem.show();
    context.subscriptions.push(myStatusBarItem);
    return; // Don't register commands or fully activate
  }

  // Create output channel
  outputChannel = vscode.window.createOutputChannel('SnapFlow Resume');
  context.subscriptions.push(outputChannel);

  // Initialize services
  webviewService = WebviewService.getInstance();
  timerService = new TimerService(() => {
    updateStatusBarItem();
  });

  // Initialize change tracker
  simpleChangeTracker = new SimpleChangeTracker(workspacePath);

  const webviewViewProvider = new SnapFlowWebviewViewProvider(
    context.extensionUri
  );

  const registration = vscode.window.registerWebviewViewProvider(
    SnapFlowWebviewViewProvider.viewType,
    webviewViewProvider
  );

  context.subscriptions.push(registration);

  // Register start/stop command
  let command = 'snapflow-ui.start-stop';
  context.subscriptions.push(
    vscode.commands.registerCommand(command, async () => {
      toggleStopwatch(workspacePath);
    })
  );

  // Set up change tracking event listeners
  setupChangeTracking(context);

  // Register setup command
  context.subscriptions.push(
    vscode.commands.registerCommand('snapflow.setup', async () => {
      await setupApiKey();
    })
  );

  // Register status command
  context.subscriptions.push(
    vscode.commands.registerCommand('snapflow.status', async () => {
      await showStatus();
    })
  );

  // Register test webview command
  context.subscriptions.push(
    vscode.commands.registerCommand('snapflow.test-webview', () => {
      webviewService.showResponse('Test response from command');
    })
  );

  // Register test getCurrentResponse command
  context.subscriptions.push(
    vscode.commands.registerCommand('snapflow.test-get-response', () => {
      const currentResponse = webviewService.getCurrentResponse();
      vscode.window.showInformationMessage(
        `Current response: ${currentResponse || 'None'}`
      );
    })
  );

  // Register openFile command for webview
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'snapflow.openFile',
      (filePath: string, startLine: number, endLine?: number) => {
        openFileAtLine(filePath, startLine, endLine);
      }
    )
  );

  // Handle webview messages
  webviewService.setMessageHandler((message: any) => {
    if (
      message.command === 'executeCommand' &&
      message.commandId === 'snapflow.openFile'
    ) {
      const [filePath, startLine, endLine] = message.args;
      openFileAtLine(filePath, startLine, endLine);
    }
  });

  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  context.subscriptions.push(myStatusBarItem);
  updateStatusBarItem();
}

function toggleStopwatch(cwd: string) {
  if (timerService.isActive()) {
    stopStopwatch(cwd);
  } else {
    startStopwatch(cwd);
  }
}

async function startStopwatch(cwd: string) {
  if (timerService.isActive()) {
    // Timer is already running, stop it
    await stopStopwatch(cwd);
    return;
  }

  // Start the timer
  timerService.start();

  // Change tracking is always active (no session management needed)

  // Get resume and populate output panel
  try {
    const summary = await enhancedPromptForResume(cwd);

    // Keep existing output channel functionality
    outputChannel.appendLine('');
    outputChannel.appendLine('=== SnapFlow Resume ===');
    outputChannel.appendLine(new Date().toLocaleString());
    outputChannel.appendLine('');
    outputChannel.appendLine(summary);

    // Show response in webview
    if (webviewService) {
      webviewService.showResponse(summary);
      console.log('✅ Resume displayed successfully');
    } else {
      console.error('🔍 Extension: webviewService is undefined!');
    }

    // Extract the brief description (first line after "Recent Work:")
    const briefMatch = summary.match(/Recent Work: (.+)/);
    const briefDescription = briefMatch
      ? 'SnapFlow Resume: ' + briefMatch[1]
      : 'SnapFlow session resumed';

    // Show info message with button to open webview
    const selection = await vscode.window.showInformationMessage(
      briefDescription,
      'View in Webview'
    );

    if (selection === 'View in Webview') {
      if (webviewService) {
        try {
          await webviewService.focusWebview();
        } catch (error) {
          console.error('Failed to focus webview:', error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to show resume:', error);
    const errorMessage =
      'Failed to generate resume. Please check your API key and try again.';

    if (webviewService) {
      webviewService.showResponse(errorMessage);
    }
    vscode.window.showErrorMessage(errorMessage);
  }
}

async function stopStopwatch(cwd: string) {
  timerService.stop();

  // Stop tracking all files and capture changes
  if (simpleChangeTracker) {
    const changes = simpleChangeTracker.stopTrackingAll();
    console.log(`📝 Captured ${changes.length} file changes`);
  }

  // Auto-save session when timer stops
  try {
    await saveSession(cwd);
    vscode.window.showInformationMessage('Session context saved successfully');
  } catch (error) {
    console.warn('⚠️ Could not auto-save session:', error);
    vscode.window.showWarningMessage('Failed to save session context');
    // Don't throw - timer should still stop even if save fails
  }
}

/**
 * Show current SnapFlow status and configuration
 */
async function showStatus(): Promise<void> {
  const configSummary = configService.getConfigSummary();
  const hasApiKey = configService.hasValidApiKey();

  let message = '🔍 **SnapFlow Status**\n\n';

  if (hasApiKey) {
    message += '✅ **API Key**: Configured\n';
    message += '✅ **Workspace**: Set up\n';
    message += '✅ **Ready to use**\n\n';
    message += 'You can now use SnapFlow to track your coding sessions!';
  } else {
    message += '⚠️ **API Key**: Not configured\n';
    message += '⚠️ **Workspace**: Set up\n';
    message += '❌ **Not ready**\n\n';
    message += 'Please configure your OpenAI API key to get started.';
  }

  const action = hasApiKey ? 'OK' : 'Setup API Key';

  const selection = await vscode.window.showInformationMessage(message, action);

  if (selection === 'Setup API Key') {
    await setupApiKey();
  }
}

/**
 * Setup API key through user input
 */
async function setupApiKey(): Promise<void> {
  try {
    // Prompt user for API key
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your OpenAI API key',
      password: true,
      placeHolder: 'sk-...',
      validateInput: value => {
        if (!value || value.trim().length === 0) {
          return 'API key cannot be empty';
        }
        if (!value.startsWith('sk-')) {
          return 'API key should start with "sk-"';
        }
        return null;
      },
    });

    if (apiKey) {
      // Save the API key
      await configService.saveApiKey(apiKey);

      // Show success message
      vscode.window.showInformationMessage(
        '✅ API key configured successfully!'
      );

      // Update status bar
      updateStatusBarItem();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`❌ Failed to configure API key: ${error}`);
  }
}

function updateStatusBarItem(): void {
  if (!myStatusBarItem) return;

  const hasApiKey = configService.hasValidApiKey();

  if (timerService.isActive()) {
    // Timer is running - show time
    const timeString = timerService.getElapsedTime();
    myStatusBarItem.text = `⏱️ ${timeString}`;
    myStatusBarItem.tooltip = 'Click to stop timer and save session';
    myStatusBarItem.command = 'snapflow-ui.start-stop';
  } else if (hasApiKey) {
    // Timer stopped, API key configured
    myStatusBarItem.text = '⏹️ SnapFlow';
    myStatusBarItem.tooltip =
      'Click to start timer and show resume (API key configured)';
    myStatusBarItem.command = 'snapflow-ui.start-stop';
  } else {
    // No API key configured
    myStatusBarItem.text = '⚠️ SnapFlow';
    myStatusBarItem.tooltip = 'Click to setup API key';
    myStatusBarItem.command = 'snapflow.setup';
  }

  myStatusBarItem.show();
}

/**
 * Set up change tracking event listeners
 */
function setupChangeTracking(context: vscode.ExtensionContext): void {
  // Listen for text document changes
  const changeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
    //  Use SimpleChangeTracker
    if (simpleChangeTracker) {
      for (const change of event.contentChanges) {
        simpleChangeTracker.recordChange(event.document, change);
      }
    }
  });

  // Listen for document saves
  const saveDisposable = vscode.workspace.onDidSaveTextDocument(document => {
    // SimpleChangeTracker - capture changes on save
    if (simpleChangeTracker) {
      console.log(
        `💾 SimpleChangeTracker: Document saved: ${document.fileName}`
      );
      // Stop tracking this file and capture changes
      const changes = simpleChangeTracker.stopTracking(document.uri.fsPath);
      if (changes) {
        console.log(`📝 Captured changes for ${document.fileName}:`, changes);
      }
    }
  });

  // Add disposables to context
  context.subscriptions.push(changeDisposable, saveDisposable);
}

/**
 * Open a file at specific line numbers
 */
async function openFileAtLine(
  filePath: string,
  startLine: number,
  endLine?: number
): Promise<void> {
  try {
    // Convert file path to URI
    const uri = vscode.Uri.file(filePath);

    // Open the document
    const document = await vscode.workspace.openTextDocument(uri);

    // Show the document in the active editor
    const editor = await vscode.window.showTextDocument(document);

    // Reveal the start line
    const startPosition = new vscode.Position(startLine - 1, 0); // Convert to 0-based index
    editor.revealRange(
      new vscode.Range(startPosition, startPosition),
      vscode.TextEditorRevealType.InCenter
    );

    // Set selection if end line is provided
    if (endLine && endLine > startLine) {
      const endPosition = new vscode.Position(endLine - 1, 0);
      editor.selection = new vscode.Selection(startPosition, endPosition);
    } else {
      // Just place cursor at start line
      editor.selection = new vscode.Selection(startPosition, startPosition);
    }

    // Silent success
  } catch (error) {
    console.error('❌ Extension: Failed to open file:', error);
    vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (timerService) {
    timerService.destroy();
  }

  if (simpleChangeTracker) {
    // Stop tracking all files and capture changes
    const changes = simpleChangeTracker.stopTrackingAll();
    console.log(`📝 Captured ${changes.length} file changes on deactivation`);

    // Clean up old changes
    simpleChangeTracker.cleanupOldChanges();
  }
}
