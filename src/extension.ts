//TODO: chrome logging
//TODO: publish
//TODO: hook up to backend
//TODO: front end for student teacher communication
//TODO: add aggregation of inputs
//TODO: track active time spent coding

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as JSONStream from 'JSONStream';
import * as https from 'https';
import * as os from 'os';
import { send } from 'process';
const axios = require('axios');
const { createHash } = require('crypto');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	vscode.commands.registerCommand('extension.selectOption', () => {
		const options = ['COMP 110', 'COMP 210', 'COMP 301'];
	
		vscode.window.showQuickPick(options).then(selection => {
		if (selection) {
			// Handle the selected option
			vscode.window.showInformationMessage(`You selected: ${selection}`);
		}else{
			vscode.commands.executeCommand("extension.selectOption");
		}
		});
	});

	vscode.commands.executeCommand("extension.selectOption");

	let tracker = new Tracker();
	if (!fs.existsSync(context.globalStorageUri.fsPath)){
		fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
	}
	tracker.editLogPath = context.globalStorageUri.fsPath + path.sep + 'editLog.json';
	// console.log(tracker.editLogPath);
	// const machineId = getMachineId();
	// console.log('Machine ID:', machineId);
	
	// TODO: need to implement separate command for playing back actions.
	// reconstruction will happen by first turning off the logging, then building, then turning logging back on
	context.subscriptions.push(
		vscode.commands.registerCommand('tracker.replayActions', function (args) {
			tracker.dispose();
			tracker.replayActions();
			tracker.initialize();
		})
	);
	context.subscriptions.push(tracker);
	tracker.initialize();
}

export class Tracker {
	private disposable : vscode.Disposable;
	constructor() {}
	private editLogFile;
	public editLogPath =  __dirname + path.sep + 'editLog.json';
	private fsWatcher;
	//TODO: set the above equal to fs.watch in initialize, and then close it when dispose method is called.

	public initialize() : void {
		this.editLogFile = fs.createWriteStream(this.editLogPath, { flags: 'a' });
		
		//TODO: add fswatcher.close to dipose method, and abstract this away

		let fsWatchCounter = 0;
		let json = {
		  'command': 'renameFile',
		  'path': '',
		  'time': new Date(Date.now()).toLocaleString(),
		  'position': null,
		  'arguments': []
		};
	
		//TODO: Fix issue where this is unable to recognize directories with spaces in them.
		fs.watch(vscode.workspace.workspaceFolders[0].uri.toString().substring(7, vscode.workspace.workspaceFolders[0].uri.toString().length), { recursive: false }, (eventType, fileName) => {
		  if (eventType === 'rename') {
			let path = vscode.workspace.workspaceFolders[0].uri.toString().substring(7, vscode.workspace.workspaceFolders[0].uri.toString().length);
	
			if (fsWatchCounter === 0) {
			  json.path = path;
			  json.arguments.push(fileName);
			  fsWatchCounter++;
			} else {
			  json.arguments.push(fileName);
			  fsWatchCounter--;
			  // For JSON output:
			  this.editLogFile.write(JSON.stringify(json) + ",");
	
			  // For human-readable output: 
			//   this.editLogFile.write(
			// 	'###########\r\n'
			// 	+ 'path: ' + json.path + '\r\n'
			// 	+ 'time: ' + json.time + '\r\n'
			// 	+ 'position: ' + json.position + '\r\n'
			// 	+ 'command: ' + json.command + '\r\n'
			// 	+ 'arguments: ' + json.arguments + '\r\n'
			// 	+ '###########\r\n\n'
			//   );
	
			  json.path = '';
			  json.arguments = [];
	
			}
		  }
		});
		this.setupOverridenCommands();
		this.sendLogFileToServer();
		setInterval(() => this.sendLogFileToServer(), 10000);
	}
	public dispose() : void {
		this.disposable.dispose();
	}

	public hash(string) {
		return createHash('sha256').update(string).digest('hex');
	}

	public getMachineId(): string {
		const networkInterfaces = os.networkInterfaces();
	  
		// Iterate over network interfaces to find the MAC address
		for (const [, interfaces] of Object.entries(networkInterfaces)) {
		  // console.log(interfaces);
		  for (const iface of interfaces) {
			// Check if the interface is not a loopback and is not a virtual interface
			if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
			  return this.hash(iface.mac);
			}
		  }
		}
	  
		// Return an empty string if the machine ID could not be found
		return '';
	}

	private async sendLogFileToServer() {
		// console.log(fs.readFile(this.editLogPath).toString())
		fs.readFile(this.editLogPath, (err, data) => {
			if (err) {
				console.log(err);
				return;
			}
			if (data.length == 0) {return;}

			const macAddress = this.getMachineId();
			let dataContent = '[' + data.toString().substring(0, data.length - 1) + ']';
			console.log(dataContent);
			let content = JSON.stringify({
			"body": {
				"password": "password",
				"course_id": "TEST_COURSE", // need to specification on the course
				"machine_id": macAddress, // hashed mac address
				"log_id": "WEI_TEST", // unique id for user
				"log_type": "VSCODE_TEST", // VSCODE
				"log": {
				"Sample": [dataContent]
				}
			}
			});

			let config = {
			method: 'post',
			maxBodyLength: Infinity,
			url: 'https://us-south.functions.appdomain.cloud/api/v1/web/ORG-UNC-dist-seed-james_dev/cyverse/add-cyverse-log',
			headers: { 
				'Content-Type': 'application/json'
			},
			data : content
			};

			axios.request(config)
			.then((response) => {
			console.log(JSON.stringify(response.data));
			})
			.catch((error) => {
			console.log(error);
			});

			// const options = {
			// 	hostname: "eo339ttlrnh0yvi.m.pipedream.net",
			// 	port: 443,
			// 	path: "/",
			// 	method: "POST",
			// 	headers: {
			// 		"Content-Type": "application/json",
			// 		"Content-Length": data.length,
			// 	},
			// };
			// const req = https.request(options);
			// console.log(req);
			// req.write('[' + data.toString().substring(0, data.length - 1) + ']');
			// req.end();
		});
		
	}

	private setupOverridenCommands(): void {
		let subscriptions: vscode.Disposable[] = [];
		
		//TODO: create a map with all opened textdocuments,
		//check to see if the document was changed after it was last opened/saved/closed
		// if so, log opening it. otherwise don't. use timestamps for both change, and last open.
		let textDocumentInfoMap = new Map();

		//TODO: this might be useful in the future to only limit tracking to certain workspace folders
		// vscode.workspace.onDidChangeWorkspaceFolders((event) => {
			
		// }, this, subscriptions);

		//capture saving text doc
		vscode.workspace.onDidSaveTextDocument((event) => {
			let args = {
				'fileName': event.fileName,
				'contents': event.getText()
			};
			this.logEdits('save', JSON.stringify(args));
		}, this, subscriptions);
		//capture closing text doc
		vscode.workspace.onDidCloseTextDocument((event) => {
			let args = {
				'fileName': event.fileName,
				'contents': event.getText()
			};
			this.logEdits('close', JSON.stringify(args));
		}, this, subscriptions);
		//capture opening text doc
		vscode.workspace.onDidOpenTextDocument((event) => {
			let args = {
				'fileName': event.fileName,
				'contents': event.getText()
			};
			this.logEdits('open', JSON.stringify(args));
		}, this, subscriptions);

		//setting up paste command override
	
		var pasteDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardPasteAction', () => {
		  vscode.env.clipboard.readText().then((text) => {
			this.logEdits('paste', text);
		  });
		  pasteDisposable.dispose();
		  vscode.commands.executeCommand("editor.action.clipboardPasteAction").then(() => {
			pasteDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardPasteAction', pasteOverride);
			subscriptions.push(pasteDisposable);
		  });
		});
	
		var pasteOverride = () => {
		  vscode.env.clipboard.readText().then((text) => {
			this.logEdits('paste', text);
		  });
		  pasteDisposable.dispose();
		  vscode.commands.executeCommand("editor.action.clipboardPasteAction").then(() => {
			pasteDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardPasteAction', pasteOverride);
			subscriptions.push(pasteDisposable);
		  });
		};
	
		//setting up copy override
	
		var copyDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', async () => {
			copyDisposable.dispose();
		    vscode.commands.executeCommand("editor.action.clipboardCopyAction").then(async () => {
				// let text = await vscode.env.clipboard.readText();
				  vscode.env.clipboard.readText().then((text) => {
					this.logEdits('copy', text);
				  });
				// console.log(text);
				// this.logEdits('copy', text);
				copyDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', copyOverride);
				subscriptions.push(copyDisposable);
		  	});
		});
	
		var copyOverride = async () => {
			copyDisposable.dispose();
		    vscode.commands.executeCommand("editor.action.clipboardCopyAction").then(async () => {
				// let text = await vscode.env.clipboard.readText();
				  vscode.env.clipboard.readText().then((text) => {
					this.logEdits('copy', text);
				  });
				// console.log(text);
				// this.logEdits('copy', text);
				copyDisposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', copyOverride);
				subscriptions.push(copyDisposable);
		  	});
		};
	
		//setting up input override
		//TODO: fix bug where you can select some text and then type a letter, which deletes the previous letters but this deletion isnt logged.
		var typeDisposable = vscode.commands.registerCommand('type', (args) => {
		  this.logEdits('input', args.text);
		  vscode.commands.executeCommand('default:' + 'type', args);
		});
	
		//setting up delete override
	
		var deleteDisposable = vscode.commands.registerCommand('deleteRight', () => {
		  let editor = vscode.window.activeTextEditor;
		  if (!editor) {
			return;
		  }
		  let selection = editor.selection;
		  let text = editor.document.getText(selection);
		  this.logEdits('delete', text);
		  deleteDisposable.dispose();
		  vscode.commands.executeCommand("deleteRight").then(() => {
			deleteDisposable = vscode.commands.registerCommand('deleteRight', deleteOverride);
			subscriptions.push(deleteDisposable);
		  });
		});
	
		var deleteOverride = () => {
		  let editor = vscode.window.activeTextEditor;
		  if (!editor) {
			return;
		  }
		  let selection = editor.selection;
		  let text = editor.document.getText(selection);
		  this.logEdits('delete', text);
		  deleteDisposable.dispose();
		  vscode.commands.executeCommand("deleteRight").then(() => {
			deleteDisposable = vscode.commands.registerCommand('deleteRight', deleteOverride);
			subscriptions.push(deleteDisposable);
		  });
		};
	
		//setting up backspace override
	
		var backspaceDisposable = vscode.commands.registerCommand('deleteLeft', () => {
		  let editor = vscode.window.activeTextEditor;
		  if (!editor) {
			return;
		  }
		  let selection = editor.selection;
		  let text = editor.document.getText(selection);
		  this.logEdits('backspace', text);
		  backspaceDisposable.dispose();
		  vscode.commands.executeCommand("deleteLeft").then(() => {
			backspaceDisposable = vscode.commands.registerCommand('deleteLeft', backspaceOverride);
			subscriptions.push(backspaceDisposable);
		  });
		});
	
		var backspaceOverride = () => {
		  let editor = vscode.window.activeTextEditor;
		  if (!editor) {
			return;
		  }
		  let selection = editor.selection;
		  let text = editor.document.getText(selection);
		  this.logEdits('backspace', text);
		  backspaceDisposable.dispose();
		  vscode.commands.executeCommand("deleteLeft").then(() => {
			backspaceDisposable = vscode.commands.registerCommand('deleteLeft', backspaceOverride);
			subscriptions.push(backspaceDisposable);
		  });
		};
	
		//setting up undo override
	
		var undoDisposable = vscode.commands.registerCommand('undo', () => {
		  this.logEdits('undo', null);
		  vscode.commands.executeCommand('default:' + 'undo');
		});
	
		//setting up redo override
	
		var redoDisposable = vscode.commands.registerCommand('redo', () => {
		  this.logEdits('redo', null);
		  vscode.commands.executeCommand('default:' + 'redo');
		});
	
		//see api here: https://code.visualstudio.com/api/references/vscode-api#debug
		/*basically this attaches a listener to the debugger called a debugadaptertracker, which receives all the messages that are sent between the debugger and vscode. 
		I'm just listening in on the messages that are being passed and logging the ones that are part of the stderr, stdin, and stdout streams. There are other streams
		that can be listened to as well, but not 100% sure what they do.*/

		var debugConsoleDisposable = vscode.debug.registerDebugAdapterTrackerFactory('*', {
			createDebugAdapterTracker:(session: vscode.DebugSession) => {
				return {
					onDidSendMessage:m => {
						if (m.type === 'event' && m.event === 'output' && m.body.output) {
							if (m.body.category === 'stderr' || m.body.category === 'stdin' || m.body.category === 'stdout') {
								console.log(m);
								this.logEdits('debugConsole', m);
							}
						}
					}
				};
			}
		});

		subscriptions.push(pasteDisposable);
		subscriptions.push(copyDisposable);
		subscriptions.push(typeDisposable);
		subscriptions.push(deleteDisposable);
		subscriptions.push(backspaceDisposable);
		// subscriptions.push(refactorDisposable);
		subscriptions.push(undoDisposable);
		subscriptions.push(redoDisposable);
		subscriptions.push(debugConsoleDisposable);
		this.disposable = vscode.Disposable.from(...subscriptions);
	}

	private logEdits(type: String, args: any): void {
		let editor = vscode.window.activeTextEditor;
		if (editor) {
		  let doc = editor.document;
		  if (doc) {
			let text = editor.document.getText();
			let selection = editor.selection;
			if (selection) {
			  let start = selection.start;
			  if (start) {
				let pos = start.line + ',' + start.character;
				let uri = doc.uri;
				if (uri) {
				  let path = uri.path;
				  let json = {
					'command': type,
					'path': path,
					'time': new Date(Date.now()).toLocaleString(),
					'position': pos,
					'arguments': args
				  };
	
				  // For JSON output:
				//   const addHeaders = new Headers()
				//   addHeaders.append("Content-Type", "application/json");
				//   fetch('https://eo339ttlrnh0yvi.m.pipedream.net', {
				// 	method: 'POST',
				// 	headers: addHeaders,
				// 	body: JSON.stringify(json),
				//   });

				const data = JSON.stringify(json);
				
				// const options = {
				// 	hostname: "eo339ttlrnh0yvi.m.pipedream.net",
				// 	port: 443,
				// 	path: "/",
				// 	method: "POST",
				// 	headers: {
				// 	  "Content-Type": "application/json",
				// 	  "Content-Length": data.length,
				// 	},
				//   };
				  
				//   const req = https.request(options);
				//   req.write(data);
				//   req.end();

				  this.editLogFile.write(JSON.stringify(json) + ",");
	
				  // For human-readable output: 
				//   this.editLogFile.write(
				// 	'###########\r\n'
				// 	+ 'path: ' + json.path + '\r\n'
				// 	+ 'time: ' + json.time + '\r\n'
				// 	+ 'position: ' + json.position + '\r\n'
				// 	+ 'command: ' + json.command + '\r\n'
				// 	+ 'arguments: ' + json.arguments + '\r\n'
				// 	+ '###########\r\n\n'
				//   );
	
				  // this.editLogFile.write('!@#$!@#$!@#$\r\n' + path + '\r\n' + Date.now() + '\r\n'
				  //   + pos + '\r\n' + text + '$#@!$#@!$#@!\r\n');
				}
			  }
			}
		  }
		}	
	}

	public replayActions(/* TODO: possibly pass in the time that we want to recreate up to here.
		possibly pass in the index of the action that needs to be done up to this point, so that we can traverse through in steps */): void {
		//types of actions
		// rename, save, close, open
		// paste, copy, input, delete, backspace, undo, redo
		let readLogFile = fs.createReadStream(this.editLogPath, { flags: 'a+' });
		let parseJSONStream = JSONStream.parse();
		let replayMap = new Map();
		let replayDir = __dirname;

		parseJSONStream.on('data', (data) => {
			let mapFile;
			if (!replayMap.has(data.path)) {
				fs.writeFile(path.join(__dirname, 'replay', data.path), '', function(err) {
					if(err) {
						console.log(err);
					}
					console.log("The file was saved!");
				});
				mapFile = vscode.Uri.parse('untitled:' + path.join(__dirname, 'replay', data.path));
				replayMap.set(data.path, mapFile);
			} else {
				mapFile = replayMap.get(mapFile);
			}
			if (data.command === 'input') {
				vscode.workspace.openTextDocument(mapFile).then(document => {
					let edit = new vscode.WorkspaceEdit;
					edit.insert(mapFile, new vscode.Position(data.position.split(',')[0], data.position.split(',')[1]), data.arguments);
					vscode.workspace.applyEdit(edit);
				});
			} else if (data.command === 'copy') {
				
			} else if (data.command === 'paste') {

			} else if (data.command === 'delete') {

			} else if (data.command === 'backspace') {

			} else if (data.command === 'undo') {

			} else if (data.command === 'redo') {

			} else if (data.command === 'rename') {

			} else if (data.command === 'save') {

			} else if (data.command === 'close') {

			} else if (data.command === 'open') {

			}
		});
		readLogFile.pipe(parseJSONStream);
	}
	  
}

// this method is called when your extension is deactivated
export function deactivate() {}
