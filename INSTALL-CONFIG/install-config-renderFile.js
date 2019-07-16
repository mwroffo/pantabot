const ipcRenderer = require('electron').ipcRenderer;

function sendForm(event) {
    event.preventDefault()
    const jiraUsername = document.getElementById("jira-username").value;
    const jiraPassword = document.getElementById("jira-password").value;
    const githubUsername = document.getElementById("github-username").value;
    const githubPassword = document.getElementById("github-password").value;
    ipcRenderer.send('register-auth', jiraUsername, jiraPassword, githubUsername, githubPassword);
}