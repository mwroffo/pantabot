const OWNER_REPOS = require('./config.js').OWNER_REPOS;
const ipcRenderer = require('electron').ipcRenderer;
const dialog = require('electron').remote.dialog;
const Panta = require('./panta.js');
const START_DATE = document.getElementById("startDate").value; // EST
const END_DATE = document.getElementById("endDate").value; // EST

async function sendForm(event) {
    event.preventDefault(); // stop the form from submitting
    const owner = document.getElementById("owner").value;
    const repo = document.getElementById("repo").value;
    let issues = document.getElementById("jira-issue-codes").value;
    issues = issues.split(' ');
    ipcRenderer.send('form-submission', owner, repo, issues, {post: true, debug: false, uiIsOn: true} );
}
async function renderQueryTargetsContainer(event) {
    event.preventDefault();
    const options = await Panta.multiRepoGetTargetIssues(OWNER_REPOS.split(' '), START_DATE, END_DATE, {debug: true, uiIsOn: true});

    const optionsString = Panta.getTargetIssuesString(options, {debug: true, uiIsOn: true});
    console.log(`optionsString is`, optionsString);

    const ownerRepos = OWNER_REPOS.split(' ');
    const issueObjArrays = Object.values(options);

    // TODO append to each issueObjArray: any valid issueIDs from the textfields rendered earlier.
    

    const queryTargetsContainer = document.getElementById("queryTargetsContainer");
    if (queryTargetsContainer) console.log(`in renderQueryTargetsContainer queryTargetsContainer is`, queryTargetsContainer);
    for (let i=0; i<ownerRepos.length; i++) {
        let ownerRepoULs = queryTargetsContainer.children;
        const  ownerRepoUL = ownerRepoULs[i];
        const issues = issueObjArrays[i];
        for (let j=0; j<issues.length; j++) {
            const issue = issues[j];
            ownerRepoUL.appendChild(getIssueLI(issue));
        }
    }
}
(async function renderTargetReposAndEntryField() {
    const currentContents = document.getElementById("ownerRepos").innerHTML;
    document.getElementById("ownerRepos").innerHTML = `${currentContents}${OWNER_REPOS}`

    const ownerRepos = OWNER_REPOS.split(' ');
    
    const queryTargetsContainer = document.getElementById("queryTargetsContainer");
    if (queryTargetsContainer) console.log(`in renderQueryTargetsContainer queryTargetsContainer is`, queryTargetsContainer);
    for (let i=0; i<ownerRepos.length; i++) {
        let label = document.createElement("ul");
        label.name = `${ownerRepos[i]}`;
        label.innerHTML = `${ownerRepos[i]}`;
        queryTargetsContainer.appendChild(label);
        
        let issueIDTextField = document.createElement("input");
        issueIDTextField.type = "text";
        issueIDTextField.name = `${ownerRepos[i]}-id-input`;
        issueIDTextField.id = `${ownerRepos[i]}-id-input`;
        label.appendChild(issueIDTextField);
        let issueIDSubmitButton = document.createElement("input");
        issueIDSubmitButton.type = "submit";
        issueIDSubmitButton.value = "add Github issue by ID";
        label.appendChild(issueIDSubmitButton);
    }
})();

function sendBulkUpdateForm(event) {
    event.preventDefault();
    const newMilestoneTitle = document.getElementById("newMilestoneTitle").value;

    const options = getTargetIssuesFromForm();
    
    // todo remove duplicated getTargetIssues behavior from bulkUpdate handler
    ipcRenderer.send('bulkUpdateFormSubmission', START_DATE, END_DATE, newMilestoneTitle, options, {debug: true, uiIsOn: true} );
}

function getTargetIssuesFromForm() {
    let toReturn = {};
    const queryTargetsContainer = document.getElementById("queryTargetsContainer");
    const ownerRepoHTMLCollection = queryTargetsContainer.children;
    if (ownerRepoHTMLCollection.length === 0) {
        const err = new Error('Empty issue query. Enter a date range, then click \'Query issues in date range\' to prepare a bulk issue update')
        handleErr(err);
    }
    console.log(`in getTargetIssuesFromForm, ownerRepoHTMLCollection are`, ownerRepoHTMLCollection);
    for (let i=0; i<ownerRepoHTMLCollection.length; i++) {
        const issues = ownerRepoHTMLCollection[i].children;
        toReturn[ownerRepoHTMLCollection[i].name] = [];
        for (let j=0; j<issues.length; j++) {
            toReturn[ownerRepoHTMLCollection[i].name].push(+issues[j].id);
        }
    }
    return toReturn;
}
function handleErr(err) {
    dialog.showMessageBox({
    type: "error",
    message: `${err.name} ${err.message}`
    });
    console.log(`${err.name} ${err.message}`);
    throw err;
}
/**
 * returns an HTML li element representing a github issue
 * @param {*} issue 
 */
function getIssueLI(issue) {
    let issueLI = document.createElement("li");
    issueLI.id = `${issue.id}`;
    issueLI.innerHTML = ` ${issue.id} \'${issue.title}\'`;
    return issueLI;
}