const ipcRenderer = require('electron').ipcRenderer;

function sendForm(event) {
    event.preventDefault() // stop the form from submitting
    const owner = document.getElementById("owner").value;
    const repo = document.getElementById("repo").value;
    let issues = document.getElementById("jira-issue-codes").value;
    issues = issues.split(' ');
    ipcRenderer.send('form-submission', owner, repo, issues);
}