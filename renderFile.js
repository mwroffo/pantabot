const OWNER_REPOS = require('./config.js').OWNER_REPOS;
const ipcRenderer = require('electron').ipcRenderer;
const Panta = require('./panta.js');

async function sendForm(event) {
    event.preventDefault(); // stop the form from submitting
    const owner = document.getElementById("owner").value;
    const repo = document.getElementById("repo").value;
    let issues = document.getElementById("jira-issue-codes").value;
    issues = issues.split(' ');
    document.getElementById("testTarget").innerHTML = 'derp a scerp!'
    ipcRenderer.send('form-submission', owner, repo, issues, {debug: false, uiIsOn: true} );
}
async function promptTargetIssues(event) {
    event.preventDefault();
    const startDate = document.getElementById("startDate").value; // EST
    const endDate = document.getElementById("endDate").value; // EST
    const options = await Panta.multiRepoGetTargetIssues(OWNER_REPOS.split(' '), startDate, endDate, {debug: true, uiIsOn: true});
    let ownerRepos = Object.keys(options);
    let issueIDsClusters = Object.values(options);
    let optionsString = `${ownerRepos[0]}: issues ${issueIDsClusters[0]}`;
    for (let i=1; i<ownerRepos.length; i++) {
        optionsString = optionsString + `\n${ownerRepos[i]}: issues ${issueIDsClusters[i]}`;
    }
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
