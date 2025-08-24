import * as vscode from 'vscode';
import * as path from 'path';
import { WebviewService } from './WebviewService';

export class SnapFlowWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'snapflow.webview';

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    console.log('🔍 WebviewViewProvider: resolveWebviewView called');
    console.log('🔍 WebviewViewProvider: viewType:', webviewView.viewType);

    // Set the webview reference in the service
    WebviewService.getInstance().setWebview(webviewView);

    // Set webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this._extensionUri.fsPath, 'out', 'webview')),
      ],
    };

    // Set the HTML content (React will handle data via postMessage)
    webviewView.webview.html = this._getBasicHtml(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'getCurrentResponse':
          const currentResponse =
            WebviewService.getInstance().getCurrentResponse();
          if (currentResponse) {
            console.log(
              '🔍 WebviewViewProvider: Sending current response to webview'
            );
            webviewView.webview.postMessage({
              command: 'currentResponse',
              content: currentResponse,
            });
          } else {
            console.log('🔍 WebviewViewProvider: No current response to send');
          }
          return;
        case 'alert':
          vscode.window.showInformationMessage(message.text);
          return;
      }
    });
  }

  private _getBasicHtml(webview: vscode.Webview): string {
    const webviewScriptUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this._extensionUri.fsPath, 'out', 'webview', 'webview.js')
      )
    );

    // Get path to codicons.ttf
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(
          this._extensionUri.fsPath,
          'node_modules',
          '@vscode/codicons',
          'dist',
          'codicon.ttf'
        )
      )
    );

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SnapFlow AI Response</title>
        <style>
          @font-face {
            font-family: "codicon";
            src: url("${codiconsUri}") format("truetype");
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          #root {
            height: 100vh;
          }

          .codicon {
            font-family: 'codicon';
            line-height: 1.5;
            display: inline-block;
            text-decoration: none;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            vertical-align: middle;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script>
          console.log('🔍 HTML: Basic HTML loaded, React will request data');
        </script>
        <script src="${webviewScriptUri}"></script>
      </body>
    `;
  }
}
