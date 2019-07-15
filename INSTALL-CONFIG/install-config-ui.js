const { app, BrowserWindow, ipcMain, dialog  } = require('electron');
const Panta = require('../panta.js');
const path = require ('path');
const fs = require('fs');
const os = require('os');
const keytar = require('keytar');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let window;

function createWindow () {
  // Create the browser window.
  window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    },
    show: false
  })

  window.loadURL(`file://${__dirname}/index.html`);
  window.once('ready-to-show', function (){
    window.show();
  });

  // Open the DevTools.
  // window.webContents.openDevTools()
  
  let contents = window.webContents;
  // Emitted when the window is closed.
  window.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    window = null;
  })
}

function buildUI() {

    app.on('ready', createWindow)

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })

    app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
        if (window === null) {
            createWindow()
        }
    });

    ipcMain.on('register-auth', async function registerPasswords(
        event, jiraUsername, jiraPassword, githubUsername, githubPassword) {
          try {
            await keytar.setPassword('jira', jiraUsername, jiraPassword);
            await keytar.setPassword('github', githubUsername, githubPassword);
            handlePrint(`Successfully registered passwords for ${jiraUsername}@jira and ${githubUsername}@github.`);
          } catch (err) { handleErr(err) }
    });
}
buildUI();

// MISC UTILITIES (not obeying DRY, but these work in terms of current context, so they cannot be imported from panta)
function handlePrint(string, messageBoxType="info") {
  console.log(string); // console print
  console.log('handlePrint: electronIsParent is', electronIsParent())
  if (electronIsParent()) { // show dialog if UI exists
      dialog.showMessageBox({
      type: messageBoxType,
      message: string
      })
  }
}

function handleErr(err) {
  console.log('handleErr: electronIsParent is', electronIsParent())
  if (electronIsParent()) { // show dialog if UI exists
      dialog.showMessageBox({
      type: "error",
      message: `${err.name} ${err.message}`
      });
  }
  console.log(`${err.name} ${err.message}`);
  throw err;
}

function electronIsParent() {
  if (module.parent)
      return module.parent.filename === 'C:\\Users\\mroffo\\zowe\\pantabot\\node_modules\\electron\\dist\\resources\\default_app.asar\\main.js' 
}