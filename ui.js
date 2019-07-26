const { app, BrowserWindow, ipcMain } = require('electron');
const Panta = require('./panta.js');
const path = require ('path');
const fs = require('fs');
const os = require('os');
const keytar = require('keytar');
let GITHUB_AUTH = require('./config.js').GITHUB_AUTH;
let JIRA_AUTH = require('./config.js').JIRA_AUTH;

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
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
    const cmd = {
      post: true,
      debug: false,
      uiIsOn: true
    }
    ipcMain.on('form-submission', function j2gButtonHandler(event, owner, repo, issues, cmd) {
        Panta.multijira2github(owner, repo, undefined, issues, cmd);
    });
    ipcMain.on('bulkUpdateFormSubmission', async function bulkUpdateHandler(event, startDate, endDate, newMilestoneTitle, cmd) {
      try {
        startDate = new Date(startDate).toISOString();
        endDate = new Date(endDate).toISOString();
        // TODO k now retry this in the ui
        await Panta.doBulkMilestoneUpdate(newMilestoneTitle, startDate, endDate, cmd);
      } catch (err) { Panta.handleErr(err, true) }
    });
}
module.exports.buildUI = buildUI;
buildUI();