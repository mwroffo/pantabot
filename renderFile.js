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
function removePreviouslyQueriedIssues(issueObjArray, ownerRepoUL) {
    let issueObjArrayToReturn = issueObjArray;
    for (let i=0; i<issueObjArray.length; i++) {
        const issueObj = issueObjArray[i];
        if (isDupEntryIssue(issueObj.id, ownerRepoUL)) {
            console.log(`in removePreviouslyQueriedIssues, removing dup issue`, issueObj)
            issueObjArrayToReturn = arrayRemoveIssueObj(issueObjArrayToReturn, issueObj)
            console.log(`in removePreviouslyQueriedIssues, issueObjArrayToReturn is`, issueObjArrayToReturn)
        }
    }
    return issueObjArrayToReturn;
}
function arrayRemoveIssueObj(issueObjsArray, issueObjToRemove) {
    return issueObjsArray.filter(function(elem) {
        return elem.id != issueObjToRemove.id;
    });
}
async function renderQueryTargetsContainer(event) {
    event.preventDefault();
    let options = await Panta.multiRepoGetTargetIssues(OWNER_REPOS.split(' '), START_DATE, END_DATE, {debug: true, uiIsOn: true});
    const ownerRepos = OWNER_REPOS.split(' ');
    const issueObjArrays = Object.values(options);

    const queryTargetsContainer = document.getElementById("queryTargetsContainer");
    if (queryTargetsContainer) console.log(`in renderQueryTargetsContainer queryTargetsContainer is`, queryTargetsContainer);
    for (let i=0; i<ownerRepos.length; i++) {
        const [owner, repo] = ownerRepos[i].split('/');
        let ownerRepoULs = queryTargetsContainer.children;
        const ownerRepoUL = ownerRepoULs[i];
        let issueObjArray = issueObjArrays[i];
        issueObjArray = removePreviouslyQueriedIssues(issueObjArray, ownerRepoUL);

        const issueEntryField = document.getElementById(`${ownerRepos[i]}-id-input`);
        console.log(`in renderQueryTargetsContainer, issueEntryField for ${ownerRepos[i]} contains`, issueEntryField.value)
        
        let issueIDsArray = [];
        if (issueEntryField.value !== '') {
            issueIDsArray = issueEntryField.value.split(' ').map(e => +e);
        }
        console.log(`in renderQueryTargetsContainer, issueIDsArray for ${ownerRepos[i]} contains`, issueIDsArray);
        for (let j=0; j<issueIDsArray.length; j++) {
            const entryIssueID = issueIDsArray[j];
            const entryIssueTitle = await Panta.getIssueTitleByID(owner, repo, entryIssueID, {debug: true, uiIsOn: true} );
            const entryIssue = {"id":entryIssueID, "title": entryIssueTitle};
            if (entryIssue.title === undefined) {
                console.log(`in renderQueryTargetsContainer, silently dropping undefined issue`, entryIssue)
                // Panta.handlePrint(`Error: Confirm that issue ${entryIssueID} exists on github.com/${owner}/${repo}.`, true)
            }
            else if (isDupEntryIssue(entryIssue.id, ownerRepoUL)) { // issue already exists
                console.log(`in renderQueryTargetsContainer, silently dropping dup issue`, entryIssue);
            }
            else {
                issueObjArray.push(entryIssue);
            }
        }
        for (let j=0; j<issueObjArray.length; j++) {
            const issueObj = issueObjArray[j];
            ownerRepoUL.appendChild(getIssueLI(issueObj));
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
    }
})();

function sendBulkUpdateForm(event) {
    event.preventDefault();
    const newMilestoneTitle = document.getElementById("newMilestoneTitle").value;

    const options = getTargetIssuesFromContainer();
    
    // todo remove duplicated getTargetIssues behavior from bulkUpdate handler
    ipcRenderer.send('bulkUpdateFormSubmission', START_DATE, END_DATE, newMilestoneTitle, options, {debug: true, uiIsOn: true} );
}

function getTargetIssuesFromContainer() {
    let toReturn = {};
    const queryTargetsContainer = document.getElementById("queryTargetsContainer");
    const ownerRepoULs = queryTargetsContainer.children; // an  HTMLCollection object
    if (ownerRepoULs.length === 0) {
        const err = new Error('Empty issue query. Enter a date range, then click \'Query issues in date range\' to prepare a bulk issue update')
        handleErr(err);
    }
    // console.log(`in getTargetIssuesFromContainer, ownerRepoULs is`, ownerRepoULs);
    for (let i=0; i<ownerRepoULs.length; i++) {
        const ownerRepoUL = ownerRepoULs[i];
        const issuesLIs = ownerRepoUL.children;
        const ownerRepoName = ownerRepoUL.name;
        toReturn[ownerRepoName] = getEnteredIssueIDsForSingleRepo(ownerRepoUL);
    }
    console.log(`in getTargetIssuesFromContainer, returning`, toReturn);
    return toReturn;
}

/**
 * gets a ownerRepoUL object.
 * @return number array with issueIDs found as LIs in the ownerRepoUL
 */
function getEnteredIssueIDsForSingleRepo(ownerRepoUL) {
    let idsToReturn = [];
    const issuesLIs = ownerRepoUL.children;
    // console.log(`in issuesLIs, issuesLIs is`, issuesLIs)
    for (let i=1; i<issuesLIs.length; i++) {
        const issueLI = issuesLIs[i];
        const issueID = +issueLI.id;
        idsToReturn.push(issueID);
    }
    return idsToReturn;
}
/**
 * returns true if the passed issueID already exists in a specified ownerRepo html collection
 * @param {*} issueID 
 */
function isDupEntryIssue(issueID, ownerRepoUL) {
    const issueIDs = getEnteredIssueIDsForSingleRepo(ownerRepoUL);
    const ownerRepoName = ownerRepoUL.name;
    for (let i=0; i<issueIDs.length; i++) {
        const thatIssueID = issueIDs[i];
        if (issueID === thatIssueID) {
            console.log(`in isDupEntryIssue, ${issueID} is dup under ${ownerRepoName}`);
            return true;
        }
    }
    return false;
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
module.exports.isDupEntryIssue = isDupEntryIssue;