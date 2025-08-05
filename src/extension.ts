import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";

// Utility to run shell commands
function runCommand(command: string, cwd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(command, { cwd }, (error, stdout, stderr) => {
			if (error) reject(stderr || stdout);
			else resolve(stdout);
		});
	});
}

// Tree View Item
class TreeItem extends vscode.TreeItem {
	constructor(
		label: string,
		collapsibleState: vscode.TreeItemCollapsibleState,
		command?: vscode.Command
	) {
		super(label, collapsibleState);
		this.command = command;
	}
}

// Tree View Provider
class GitHelperTreeProvider implements vscode.TreeDataProvider<TreeItem> {
	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(): Thenable<TreeItem[]> {
		return Promise.resolve([
			new TreeItem(
				"🚀 Create & Push Repo ✨",
				vscode.TreeItemCollapsibleState.None,
				{
					command: "gitHelper.openWebviewPanel",
					title: "Create & Push Repo",
				}
			),
		]);
	}
}

// Activate Extension
export function activate(context: vscode.ExtensionContext) {
	const treeDataProvider = new GitHelperTreeProvider();
	vscode.window.registerTreeDataProvider("gitHelperPanel", treeDataProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand("gitHelper.openWebviewPanel", () => {
			const panel = vscode.window.createWebviewPanel(
				"gitHelperPanel",
				"Git Commiter",
				vscode.ViewColumn.One,
				{ enableScripts: true }
			);

			const remoteIcon = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(context.extensionUri, "media", "remote.svg")
			);
			const commitIcon = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(context.extensionUri, "media", "commit.svg")
			);
			const branchIcon = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(context.extensionUri, "media", "branch.svg")
			);

			panel.webview.html = getWebviewHtml(remoteIcon, commitIcon, branchIcon);

			panel.webview.onDidReceiveMessage(async (msg) => {
				if (msg.command === "startGitProcess") {
					let { commitMessage, remoteUrl, branchName, newBranchName } = msg;

					if (branchName === "new") {
						if (!newBranchName || newBranchName.trim() === "") {
							vscode.window.showErrorMessage(
								"❌ Please provide a name for the new branch."
							);
							return;
						}
						branchName = newBranchName;
					}

					const workspaceFolders = vscode.workspace.workspaceFolders;
					if (!workspaceFolders) {
						vscode.window.showErrorMessage("❌ Open a folder first.");
						return;
					}

					const projectPath = workspaceFolders[0].uri.fsPath;
					const gitOutput = vscode.window.createOutputChannel("Git Helper");
					gitOutput.clear();
					gitOutput.show(true);

					try {
						const gitFolder = path.join(projectPath, ".git");
						if (!fs.existsSync(gitFolder)) {
							await runCommand("git init", projectPath);
							vscode.window.showInformationMessage("✅ Git initialized.");
							gitOutput.appendLine("Git initialized.");
						} else {
							gitOutput.appendLine("✅ Git already initialized.");
						}

						try {
							await runCommand("git add .", projectPath);
							gitOutput.appendLine("✅ Files staged.");
						} catch {
							gitOutput.appendLine("Nothing to stage.");
						}

						const status = await runCommand(
							"git status --porcelain",
							projectPath
						);
						if (status.trim().length > 0) {
							await runCommand(`git commit -m "${commitMessage}"`, projectPath);
							gitOutput.appendLine("✅ Files committed.");
							vscode.window.showInformationMessage("✅ Commit created.");
						} else {
							gitOutput.appendLine("❌ No changes to commit.");
							vscode.window.showWarningMessage("⚠️ Nothing to commit.");
						}

						const remotes = await runCommand("git remote", projectPath);
						if (!remotes.includes("origin")) {
							await runCommand(
								`git remote add origin ${remoteUrl}`,
								projectPath
							);
							gitOutput.appendLine(`✅ Remote origin added: ${remoteUrl}`);
							vscode.window.showInformationMessage("✅ Remote added.");
						} else {
							gitOutput.appendLine("☢️ Remote origin already exists.");
						}

						await runCommand(`git branch -M ${branchName}`, projectPath);
						await runCommand(`git push -u origin ${branchName}`, projectPath);
						gitOutput.appendLine(`🚀 Code pushed to ${branchName}`);
						vscode.window.showInformationMessage("🚀 Code pushed!");
					} catch (err: any) {
						gitOutput.appendLine("Error: " + err);
						vscode.window.showErrorMessage("❌ Error: " + err);
					}
				}
			});
		})
	);
}

// Deactivate
export function deactivate() { }

// Modern Webview HTML
function getWebviewHtml(
	remoteIcon: vscode.Uri,
	commitIcon: vscode.Uri,
	branchIcon: vscode.Uri
): string {
	return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
  * {
    box-sizing: border-box;
  }

  body {
    background-color: #0f172a;
    color: #e2e8f0;
    font-family: 'Segoe UI', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    margin: 0;
  }

  .container {
    background-color: #1e293b;
    padding: 32px 28px;
    border-radius: 12px;
    box-shadow: 0 0 0 1px #334155;
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  h2 {
    font-size: 22px;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #cbd5e1;
  }

  .label img {
    width: 16px;
    height: 16px;
    filter: invert(100%);
  }

  input,
  select {
    width: 100%;
    padding: 12px 14px;
    background-color: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    color: #f8fafc;
    font-size: 14px;
  }

  .label-desc {
    font-size: 14px;
	font-weight: 400;
	color: #6c7073;
  }

  input::placeholder {
    color: #64748b;
  }

  #newBranchField {
    display: none;
  }

  button {
    margin-top: 4px;
    width: 100%;
    padding: 12px;
    background-color: #3b82f6;
    color: white;
    font-weight: 600;
    font-size: 15px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s ease;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }

  button:hover {
    background-color: #2563eb;
  }

  button img {
    width: 18px;
    height: 18px;
    filter: invert(100%);
  }
</style>

  </head>
  <body>
    <div class="container">
      <h2>Push Code to Git Repository</h2>

      <div class="form-group">
  <label class="label">
    <img src="${remoteIcon}" alt="remote" />
    Remote Repository URL <span class="label-desc">(if already added, leave blank)</span>
  </label>
  <input type="text" id="remoteUrl" placeholder="https://github.com/user/repo.git" />
</div>

<div class="form-group">
  <label class="label">
    <img src="${commitIcon}" alt="commit" />
    Commit Message
  </label>
  <input type="text" id="commitMessage" placeholder="Initial commit"/>
</div>

<div class="form-group">
  <label class="label">
    <img src="${branchIcon}" alt="branch" />
    Branch
  </label>
  <select id="branchName" onchange="toggleNewBranch()">
    <option value="main">main</option>
    <option value="master">master</option>
    <option value="new">Add/Create new branch</option>
  </select>
  <input type="text" id="newBranchField" placeholder="Add branch name" />
</div>


      <button onclick="submit()">🚀 Create & Push Repo</button>
    </div>

    <script>
      const vscode = acquireVsCodeApi();

      function toggleNewBranch() {
        const branchSelect = document.getElementById("branchName");
        const newBranchField = document.getElementById("newBranchField");
        newBranchField.style.display = branchSelect.value === "new" ? "block" : "none";
      }

      function submit() {
        const commitMessage = document.getElementById("commitMessage").value;
        const remoteUrl = document.getElementById("remoteUrl").value;
        const branchName = document.getElementById("branchName").value;
        const newBranchName = document.getElementById("newBranchField").value;

        vscode.postMessage({
          command: "startGitProcess",
          commitMessage,
          remoteUrl,
          branchName,
          newBranchName
        });
      }
    </script>
  </body>
  </html>
  `;
}
