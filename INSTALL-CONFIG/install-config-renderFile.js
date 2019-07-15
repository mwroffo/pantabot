const ipcRenderer = require('electron').ipcRenderer;

function sendForm(event) {
    event.preventDefault() // stop the form from submitting
    const jiraUsername = document.getElementById("jira-username").value;
    const jiraPassword = document.getElementById("jira-password").value;
    const githubUsername = document.getElementById("github-username").value;
    const githubPassword = document.getElementById("github-password").value;
    issues = issues.split(' ');
    ipcRenderer.send('register-auth', jiraUsername, jiraPassword, githubUsername, githubPassword);
}