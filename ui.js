const Panta = require('./panta.js');
const { app, BrowserWindow, ipcMain, dialog  } = require('electron');
const keytar = require('keytar');
const fs = require('fs-extra')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let window;

function createWindow () {
  // Create the browser window.
  window = new BrowserWindow({
    width: 1400,
    height: 1000,
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
  window.webContents.openDevTools()
  
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
    ipcMain.on('form-submission', function j2gButtonHandler(event, owner, repo, issues, cmd) {
        Panta.multijira2github(owner, repo, undefined, issues, cmd);
    });
    ipcMain.on('bulkUpdateFormSubmission', async function bulkUpdateHandler(event, startDate, endDate, newMilestoneTitle, options, cmd) {
      try {
        await Panta.doBulkMilestoneUpdate(newMilestoneTitle, startDate, endDate, options, cmd);
      } catch (err) { Panta.handleErr(err, true) }
    });
    ipcMain.on('register-auth', async function registerConfig(
      event, jiraUsername, jiraPassword, githubUsername, githubPassword, ownerRepos) {
        try {
          const cmd = { debug:false, uiIsOn:true };
          await keytar.setPassword('jira', jiraUsername, jiraPassword);
          await keytar.setPassword('github', githubUsername, githubPassword);
          // todo add usernames adjustment
          await editUsernameInConfig('config.js', 'JIRA_CONF', jiraUsername, cmd)
          await editUsernameInConfig('config.js', 'GITHUB_CONF', githubUsername, cmd)
          Panta.reloadAuth(jiraUsername, githubUsername);
          await editStringExport('config.js', 'OWNER_REPOS', ownerRepos, cmd);
          window.webContents.send('renderTargetReposAndEntryField')
          handlePrint(`Successfully registered passwords for ${jiraUsername}@jira and ${githubUsername}@github, and target repos ${ownerRepos}`);
        } catch (err) {
          handlePrint(`in registerConfig, throwing ${err}`);
          handleErr(err);
        }
  });
}
buildUI();

// MISC UTILS
function handlePrint(string, messageBoxType="info") {
  dialog.showMessageBox({
  type: messageBoxType,
  message: string
  })
}

function handleErr(err) {
  dialog.showMessageBox({
  type: "error",
  message: `${err.name} ${err.message}`
  });
  throw err;
}

/**
* given a path to a target .js tile, edits `module.exports[fieldToExport] = \"stringToExport\";` to the end of the target file.
* @param {*} pathToTargetFile 
* @param {*} fieldToExport 
* @param {*} stringToExport 
* @param {*} cmd 
*/
async function editStringExport(pathToTargetFile, fieldToExport, stringToExport, cmd) {
  try {
      if (cmd.debug) console.log(`in editStringExport, calling readFile(${pathToTargetFile})`);
      let contents = await fs.readFile(pathToTargetFile, 'utf8');
      if (cmd.debug) console.log(`in editStringExport, after readFile, contents contains\n`, contents);
      const regexp = new RegExp(`module\.exports\.${fieldToExport} = .*;`, "g")

      contents = contents.replace(regexp, `module.exports.${fieldToExport} = \"${stringToExport}\";`);

      await fs.writeFile(pathToTargetFile, contents, {encoding: 'utf8', flag:'w'} );
      if (cmd.debug) console.log(`in writeFile, used regexp ${regexp} and wrote ${contents} in utf8 to ${pathToTargetFile}`);
      return contents;
  } catch (err) {
      console.log(`in editStringExport(${pathToTargetFile}, ${fieldToExport}, ${stringToExport}): throwing ${err}`);
      throw err;
  }
}
async function editUsernameInConfig(pathToTargetFile, authObjName, newUsername, cmd) {
  try {
    if (cmd.debug) console.log(`in editUsernameInConfig, calling readFile(${pathToTargetFile})`);
    let contents = await fs.readFile(pathToTargetFile, 'utf8');
    if (cmd.debug) console.log(`in editUsernameInConfig, after readFile, contents contains\n`, contents);
    const regexp = new RegExp(`${authObjName}\.username = .*;`, "g")

    contents = contents.replace(regexp, `${authObjName}.username = \"${newUsername}\";`);

    await fs.writeFile(pathToTargetFile, contents, {encoding: 'utf8', flag:'w'} );
    if (cmd.debug) console.log(`in writeFile, used regexp ${regexp} and wrote ${contents} in utf8 to ${pathToTargetFile}`);
    return contents;
  } catch (err) {
      console.log(`in editUsernameInConfig(${pathToTargetFile}, ${authObjName}, ${newUsername}): throwing ${err}`);
      throw err;
  }
}
module.exports.editStringExport = editStringExport;
module.exports.buildUI = buildUI;