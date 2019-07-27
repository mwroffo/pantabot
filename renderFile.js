const OWNER_REPOS = require('./config.js').OWNER_REPOS;
const ipcRenderer = require('electron').ipcRenderer;
const Panta = require('./panta.js');
const START_DATE = document.getElementById("startDate").value; // EST
const END_DATE = document.getElementById("endDate").value; // EST

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
    const options = await Panta.multiRepoGetTargetIssues(OWNER_REPOS.split(' '), START_DATE, END_DATE, {debug: true, uiIsOn: true});
    const optionsString = Panta.getTargetIssuesString(options, {debug: true, uiIsOn: true});
    console.log(`optionsString is`, optionsString);

    const ownerRepos = OWNER_REPOS.split(' ');
    const issueObjArrays = Object.values(options);
    
    const queryTargetsContainer = document.getElementById("queryTargetsContainer");
    if (queryTargetsContainer) console.log(`in renderQueryTargetsContainer queryTargetsContainer is`, queryTargetsContainer);
    for (let i=0; i<ownerRepos.length; i++) {
        let label = document.createElement("label");
        label.for = `${ownerRepos[i]}`;
        label.innerHTML = `<strong>${ownerRepos[i]}:</strong>`;
        queryTargetsContainer.appendChild(label);
        queryTargetsContainer.appendChild(document.createElement("br"));
        const issues = issueObjArrays[i];
        for (let j=0; j<issues.length; j++) {
            const issue = issues[j];
            let issueLabel = document.createElement("label");
            issueLabel.for = `${issue.id}`;
            issueLabel.innerHTML = ` ${issue.id} \'${issue.title}\'`;
            queryTargetsContainer.appendChild(issueLabel);
            queryTargetsContainer.appendChild(document.createElement("br"));
        }
    }
}

function sendBulkUpdateForm(event) {
    event.preventDefault();
    const newMilestoneTitle = document.getElementById("newMilestoneTitle").value;
    
    // todo remove duplicated getTargetIssues behavior from bulkUpdate handler
    ipcRenderer.send('bulkUpdateFormSubmission', START_DATE, END_DATE, newMilestoneTitle, {debug: true, uiIsOn: true} );
}
(function renderQueryTargetsContainer() {
    const currentContents = document.getElementById("ownerRepos").innerHTML;
    document.getElementById("ownerRepos").innerHTML = `${currentContents}${OWNER_REPOS}`
})();
