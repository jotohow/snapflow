import * as vscode from 'vscode';
import * as path from 'path';

export class WebviewService {
  private static instance: WebviewService;
  private currentWebview: vscode.WebviewView | undefined;
  private responseData: string = '';
  private messageHandler: ((message: any) => void) | undefined;

  private constructor() {}

  static getInstance(): WebviewService {
    if (!WebviewService.instance) {
      WebviewService.instance = new WebviewService();
    }
    return WebviewService.instance;
  }

  /**
   * Creates or shows the webview view with the AI response
   */
  showResponse(response: string): void {
    console.log(
      '🔍 WebviewService: showResponse called with:',
      response.substring(0, 100) + '...'
    );

    // ALWAYS store the response data
    this.responseData = response;
    console.log('🔍 WebviewService: Response data stored');

    // ALWAYS try to update webview if it exists
    if (this.currentWebview) {
      console.log('🔍 WebviewService: Updating webview with new response');
      this.currentWebview.webview.postMessage({
        command: 'updateResponse',
        content: response,
      });
      console.log('🔍 WebviewService: Webview updated successfully');
    } else {
      console.log(
        '🔍 WebviewService: No webview available, response stored for later'
      );
    }
  }

  /**
   * Focuses and shows the webview if it exists
   */
  async focusWebview(): Promise<void> {
    console.log('🔍 WebviewService: focusWebview called');

    try {
      // Open the SnapFlow view container
      console.log('🔍 WebviewService: Opening SnapFlow view container');
      await vscode.commands.executeCommand('workbench.view.extension.snapflow');

      // Focus the specific webview view
      await vscode.commands.executeCommand('workbench.view.extension.snapflow');
      console.log('🔍 WebviewService: Successfully focused SnapFlow webview');
    } catch (error) {
      console.log('🔍 WebviewService: Focus command failed:', error);
    }
  }

  /**
   * Gets the current response data
   */
  getCurrentResponse(): string {
    return this.responseData;
  }

  /**
   * Sets the current webview reference (called by the view provider)
   */
  setWebview(webview: vscode.WebviewView): void {
    console.log('🔍 WebviewService: setWebview called, webview reference set');
    this.currentWebview = webview;

    // If we have a stored message handler, attach it now
    if (this.messageHandler) {
      console.log('🔍 WebviewService: Attaching stored message handler');
      this.currentWebview.webview.onDidReceiveMessage(this.messageHandler);
    }

    // React will request current response data when it mounts
    // No need to send it immediately here
  }

  /**
   * Sets a message handler for webview messages
   */
  setMessageHandler(handler: (message: any) => void): void {
    // Store the handler for later use
    this.messageHandler = handler;

    // If webview already exists, attach the handler immediately
    if (this.currentWebview) {
      this.currentWebview.webview.onDidReceiveMessage(handler);
    }
  }

  /**
   * Generates the HTML content for the webview
   */
  getWebviewContent(): string {
    const webviewScriptUri = this.currentWebview!.webview.asWebviewUri(
      vscode.Uri.file(path.join(__dirname, 'webview', 'webview.js'))
    );

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SnapFlow AI Response</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          #root {
            height: 100vh;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script src="${webviewScriptUri}"></script>
      </body>
      </html>
    `;
  }

  /**
   * Clears the webview reference
   */
  clearWebview(): void {
    this.currentWebview = undefined;
  }
}
