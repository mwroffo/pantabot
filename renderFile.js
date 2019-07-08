const ipcRenderer = require('electron').ipcRenderer;

function sendForm(event) {
    event.preventDefault() // stop the form from submitting
    const jiraUsername = document.getElementById("jira-username").value;
    const jiraPassword = document.getElementById("jira-password").value;
    const githubUsername = document.getElementById("github-username").value;
    const githubPassword = document.getElementById("github-password").value;
    const owner = document.getElementById("owner").value;
    const repo = document.getElementById("repo").value;
    let issues = document.getElementById("jira-issue-codes").value;
    issues = issues.split(' ');
    ipcRenderer.send('form-submission',
        jiraUsername, jiraPassword, githubUsername, githubPassword,
        owner, repo, issues);
}