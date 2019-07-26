const OWNER_REPOS = require('./config.js').OWNER_REPOS;
const ipcRenderer = require('electron').ipcRenderer;

function sendForm(event) {
    event.preventDefault(); // stop the form from submitting
    const owner = document.getElementById("owner").value;
    const repo = document.getElementById("repo").value;
    let issues = document.getElementById("jira-issue-codes").value;
    issues = issues.split(' ');
    ipcRenderer.send('form-submission', owner, repo, issues, {debug: false, uiIsOn: true} );
}
function sendBulkUpdateForm(event) {
    event.preventDefault();
    const startDate = `${document.getElementById("startDate").value}`; // EST
    const endDate = `${document.getElementById("endDate").value}`; // EST
    const newMilestoneTitle = document.getElementById("newMilestoneTitle").value;
    ipcRenderer.send('bulkUpdateFormSubmission', startDate, endDate, newMilestoneTitle, {debug: true, uiIsOn: true} );
}
(function renderOwnerRepos() {
    const currentContents = document.getElementById("ownerRepos").innerHTML;
    document.getElementById("ownerRepos").innerHTML = `${currentContents}: ${OWNER_REPOS}`;
})();