const OWNER_REPOS = require('./config.js').OWNER_REPOS;
const ipcRenderer = require('electron').ipcRenderer;
const Panta = require('./panta.js');

async function sendForm(event) {
    event.preventDefault(); // stop the form from submitting
    const owner = document.getElementById("owner").value;
    const repo = document.getElementById("repo").value;
    let issues = document.getElementById("jira-issue-codes").value;
    issues = issues.split(' ');
    ipcRenderer.send('form-submission', owner, repo, issues, {debug: false, uiIsOn: true} );
}
async function promptTargetIssues(event) {
    event.preventDefault();
    const startDate = document.getElementById("startDate").value; // EST
    const endDate = document.getElementById("endDate").value; // EST
    const options = await Panta.multiRepoGetTargetIssues(OWNER_REPOS.split(' '), startDate, endDate, {debug: true, uiIsOn: true});
    const optionsString = Panta.getTargetIssuesString(options, {debug: true, uiIsOn: true});
    console.log(`optionsString is`, optionsString);
    document.getElementById("targetIssues").innerHTML = optionsString;
}

function sendBulkUpdateForm(event) {
    event.preventDefault();
    const startDate = document.getElementById("startDate").value; // EST
    const endDate = document.getElementById("endDate").value; // EST
    const newMilestoneTitle = document.getElementById("newMilestoneTitle").value;
    
    // todo remove duplicated getTargetIssues behavior from bulkUpdate handler
    ipcRenderer.send('bulkUpdateFormSubmission', startDate, endDate, newMilestoneTitle, {debug: true, uiIsOn: true} );
}
(function renderQueryTargetsContainer() {
    const currentContents = document.getElementById("ownerRepos").innerHTML;
    document.getElementById("ownerRepos").innerHTML = `${currentContents}${OWNER_REPOS}`;
})();
