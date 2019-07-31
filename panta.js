'use strict';

const { dialog } = require('electron');
const Github = require('github-api');
const cheerio = require('cheerio');
const program = require('commander');
const RequestPromise = require('request-promise');
const Request = require('request');
const J2G_USERNAME_MAP = require('./j2g-username-map');
const CONFIG = require('./config.js');
const OWNER_REPOS = require('./config.js').OWNER_REPOS;
let JIRA_CONF = undefined;
let GITHUB_CONF = undefined;
const pkg = require('./package.json');

reloadAuth();
function reloadAuth() {
    CONFIG.getAuth().then((data) => {
        [JIRA_CONF, GITHUB_CONF] = data;
        console.log(`in reloadAuth, GITHUB_CONF is`, GITHUB_CONF, `JIRA_CONF is`, JIRA_CONF);
    });
}

function setupCLI() {
    program
        .version(pkg.version)
        .description(pkg.description)
        .usage('[options] <command> [...]');
    program
        .command('j2g <orgOrUser> <repo> <issueID> [otherIssueIDs...]')
        .option('-d --debug', 'Show debugging output', false)
        .option('-n --no-post', 'Fetch, parse, and print passed issues without posting.')
        .description('To post one or more Jira issues to github.com/<orgOrUser>/<repo>, use `node panta <orgOrUser> <repo> <issueIDs> [otherIssueIDs...]`')
        .action(multijira2github);
    program
        .command('convert-issue <issueID>')
        .description('For testing purposes. Converts given jira issue into JSON and prints it.')
        .action(convertIssue)
    program
        .command('get-user')
        .description('For testing purposes. Prints information about a given github user.')
        .action(getUser);
    program.parse(process.argv);
    if (!program.args.filter(arg => typeof arg === 'object').length) {
        // if bad args,
        console.log('Did you enter the arguments correctly?')
        program.help(); // show help
    }
}

/**
 * action function for j2g command. handles logic of porting a jira issue to github.
 * @param {} issueID 
 * @param {*} orgOrUser 
 * @param {*} repo 
 */
async function multijira2github(orgOrUser, repo, issueID, otherIssueIDs, cmd) {
    // the commander.js docs demonstrate variadic args with one as required and others as optional
    // (https://github.com/tj/commander.js#variadic-arguments)
    let postResponses = [];
    const alreadyExistingIssues = await listIssues(orgOrUser, repo, cmd); // returns an array of issues. titles don't include prefixes.
    if (issueID) otherIssueIDs.unshift(issueID); // combine into one array.

    if (otherIssueIDs) {
        otherIssueIDs.forEach(async issueID => {
            try {
                const jiraIssueXML = await fetchXML(issueID, cmd);
                const githubIssueJSON = convertXMLIssue2GithubIssue(jiraIssueXML, cmd);
                if (cmd.post) {
                    let duplicate = checkForDuplicate(alreadyExistingIssues, githubIssueJSON.title);
                    if (!duplicate) {
                        const json_response = await postIssue(githubIssueJSON, orgOrUser, repo, cmd);
                        const public_url = json_response.data.url.replace(/api\./g,'').replace(/\/repos/g,'');
                        handlePrint(`(DONE) Panta posted \'${json_response.data.title}\' to ${public_url}`, cmd.uiIsOn);
                        postResponses.push(json_response);
                    } else { handlePrint(`skipping issue '${duplicate.title}' because it is already open at https//github.com/${orgOrUser}/${repo}/issues/${duplicate.number}`, cmd.uiIsOn) }  
                } else { handlePrint(`--no-post option is set. Issues and their comments do not post. '${githubIssueJSON.title}'`, cmd.uiIsOn) }
            } catch (err) {
                err.message = `ERR thrown in function multijira2github: ${err.message}`;
                handleErr(err, cmd.uiIsOn);
            }
        });
    }
    if (!postResponses.length === 0) return postResponses;
    else return undefined
}

/* 
* Takes a jira.rocketsoftware.com issue id and returns the issue in xml form
* @param {string} [issueID] the issue's id, for example MVD-3017
*/
async function fetchXML(issueID, cmd) {
    // EDIT THIS LINE to reflect your Jira instance's XML link
    const url = `https://jira.rocketsoftware.com/si/jira.issueviews:issue-xml/${issueID}/${issueID}.xml`;
    // EDIT THIS LINE to reflect your Jira instance's XML link

    const options = {
        url: url,
        headers: {'User-Agent':'mwroffo'}
    }
    try {
        const res = await RequestPromise.get(options).auth(JIRA_CONF.username, JIRA_CONF.password);
        if (cmd.debug) console.log(`(1) FETCHING XML from ${url}\nRECEIVED${res}`);
        return res;
    } catch (err) {
        err.message = `ERR thrown in function fetchXML: ${err.message}`;
        handleErr(err, cmd.uiIsOn); 
    }
}

/*
* maps fields in a jira issue to similar fields in a github issue
* @param {JiraIssue} [jira_issue] - the Jira issue to be converted
* @return {GithubIssue} - a json object with fields corresponding to github fields.
*/

function convertXMLIssue2GithubIssue(body_xml, cmd) {
    let githubissue = {};
    const $ = cheerio.load(body_xml, {xml: {normalizeWhitespace: true}});
    let title = $('item title').text();
    title = title.replace(/\[.*\] */g, ''); // remove '[MVD-3038]' etc from title
    githubissue.title = title;
    
    let body = $('item description').text();
    githubissue.body = body;
    
    let labels = $('item labels label').toArray().map(elem => $(elem).text());
    const component = $('item component').text();
    labels.push(component);
    if (labels[0] !== '') {
        githubissue.labels = labels;
    }
    const assignee = $('item assignee').text();
    if (J2G_USERNAME_MAP[assignee] !== undefined) {
        githubissue.assignees = [J2G_USERNAME_MAP[assignee]];
    }
    
    // TODO june27 2019 labels should appear as strings in separate array indices

    if (cmd.debug) console.log(`(2) ISSUE CONVERTED `, githubissue);
    return githubissue;
}

/*
* Posts the {GithubIssue} to GitHub
* @param {GithubIssue} [github_issue] - a json object specifying the issue to be posted to github.
* @return {Promise} - the promise for the http request to the github api.
*/
async function postIssue(issue, orgOrUser, repo, cmd) {
    try {
        if (cmd.debug) {
            console.log(`(3) POSTING ISSUE to %s/%s`, orgOrUser, repo);
        }
        let json_response = {};
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        json_response = await Issue.createIssue(issue);
        return json_response;
    } catch (err) { 
        handlePrint(`failed to post '${issue.title}'`, cmd.uiIsOn);
        err.message = `err thrown in postIssue: ${err.message}`;
        handleErr(err, cmd.uiIsOn);
    }
}

async function listIssues(orgOrUser, repo, cmd) {
    try {
        const github = new Github(GITHUB_CONF);
        const Issue = github.getIssues(orgOrUser, repo);
        let issues = await Issue.listIssues();
        return issues.data;
    } catch (err) { handleErr(err, cmd.uiIsOn) }
}
async function getIssueTitleByID(orgOrUser, repo, issueID, cmd) {
    try {
        const github = new Github(GITHUB_CONF);
        const Issue = github.getIssues(orgOrUser, repo);
        let issues = await Issue.getIssue(issueID);
        return issues.data.title;
    } catch (err) {
        return undefined;
    }
}

function checkForDuplicate(issues, title) {
    let toReturn = undefined;
    issues.forEach(issue => {
        if (issue.title === title) {
            toReturn = issue;
        }
    });
    return toReturn;
}

async function getUser(orgOrUser) {
    const options = {
        url: 'https://api.github.com/user',
        headers: { 'User-Agent':'mwroffo' }
    }
    try {
        // method1 gets 400 probs parsing json
        console.log(`READING USER ${orgOrUser}`);
        Request.get('https://api.github.com/user', options, (err,res,body) => {
            if (err) handleErr(err, cmd.uiIsOn);
            console.log(res.statusCode, body);
        })
        .auth(GITHUB_CONF.username, GITHUB_CONF.password)
    } catch (err) { handleErr(err, cmd.uiIsOn) }
}

function handlePrint(string, uiIsOn) {
    if (uiIsOn) { // show dialog if UI exists
        dialog.showMessageBox({
            type: "info",
            message: string
        })
    }
    console.log(string); // console print
}

function handleErr(err, uiIsOn) {
    if (uiIsOn) { // show dialog if UI exists
        dialog.showMessageBox({
        type: "error",
        message: `${err.name} ${err.message}`
        });
    }
    console.log(`${err.name} ${err.message}`);
    throw err;
}

/**
 * Given a timestamp as string, returns boolean indicating whether (1) the issue was opened on or after startDate AND (2) has not been closed.
 * @param {string} startDate
 */
async function isOpenAndOpenedByDate(issueID, startDate) {
    return await openedByDate(issueID, startDate) && await isOpen(issueID);
}

/**
 * if issueID was opened on or after startDate, return true, else return false.
 * @param {*} orgOrUser
 * @param {*} repo 
 * @param {*} issueID 
 * @param {string} startDate in format '2019-07-17T15:09:36Z'
 * @param {*} cmd
 */
async function openedByDate(orgOrUser, repo, issueID, startDate, cmd) {
    try {
        startDate = new Date(startDate);
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        const response = await Issue.getIssue(issueID);
        const issue = response.data;
        const issueCreatedAt = new Date(issue.created_at);
        if (cmd.debug) {
            console.log('issue.created_at is', issue.created_at);
            console.log('issueUpdatedAt is', issueCreatedAt);
        }
        return issueCreatedAt <= startDate;
    } catch (err) {
        // issue did not exist, etc.
        // console.log(`printing err and returning false instead of throwing ${err}`);
        console.log(err.response.status);
        if (404 !== err.response.status) {
            handleErr(err, cmd.uiIsOn)
        } else return false;
    }
}

/**
 * returns a boolean indicating whether the issueID passed as parameter represents a valid issue in orgOrUser/repo
 * @param {string} orgOrUser 
 * @param {string} repo 
 * @param {number} issueID
 * @param {object} cmd indicates certain options.
 */
async function isOpen(orgOrUser, repo, issueID, cmd) {
    try {
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        const response = await Issue.getIssue(issueID);
        const issue = response.data;
        if (cmd.debug) console.log('issue.state is', issue.state);
        return issue.state === 'open';
    } catch (err) {
        // todo distinguish 404, 301, 410?
        if (cmd.debug) console.log(`printing err and returning false instead of throwing ${err}`);
        return false;
    }
}

/**
 * return boolean indicating whether orgOrUser/repo/issueID was (1) not closed before startDate, and (2) became closed between startDate and endDate. 
 * @param {*} orgOrUser 
 * @param {*} repo 
 * @param {*} issueID 
 * @param {*} startDate 
 * @param {*} endDate 
 * @param {*} cmd 
 */
async function changedToClosed(orgOrUser, repo, issueID, startDate, endDate, cmd) {
    try {
        let notClosedBeforeStart = false;
        let closedBeforeEnd = false;

        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        const response = await Issue.getIssue(issueID);
        const issue = response.data;

        // convert to ms since unix epoch
        startDate = new Date(startDate).getTime();
        endDate = new Date(endDate).getTime();

        // careful: for open issues, closedAt is Wed Dec 31 1969 19:00:00 GMT-0500
        if (null !== issue.closed_at) {
            const closedAt = new Date(issue.closed_at).getTime();
            closedBeforeEnd = closedAt < endDate;
            notClosedBeforeStart = !(closedAt < startDate);
        }
        if (cmd.debug) {
            if (null === issue.closed_at) {
                console.log(`in changedToClosed(${orgOrUser}, ${repo}, ${issueID}), issue is not yet closed. returning false.`);
            }
            console.log(`in changedToClosed(${orgOrUser}, ${repo}, ${issueID}), closedBeforeEnd is ${closedBeforeEnd}, notClosedBeforeStart is ${notClosedBeforeStart}, and closedBeforeEnd&&notClosedBeforeStart makes return value ${closedBeforeEnd && notClosedBeforeStart}`);
        }
        return closedBeforeEnd && notClosedBeforeStart;
    } catch (err) {
        // todo distinguish 404, 301, 410?
        if (cmd.debug) console.log(`in changedToClosed, returning false instead of throwing ${err}`);
        return false;
    }
}

/**
 * given a repo, returns an array containing those that satisfy changedToClosed for the given date range.
 * @param {*} orgOrUser 
 * @param {*} repo
 * @param {*} startDate 
 * @param {*} endDate 
 * @param {*} cmd 
 */
async function getTargetIssues(orgOrUser, repo, startDate, endDate, cmd) {
    try {
        let toReturn = [];
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        if (cmd.debug) console.log(`in getTargetIssues, before listIssues, startDate is`, startDate, `endDate is`, endDate);
        const options = {
            "state":"all",
            "since":startDate
        }
        const response = await Issue.listIssues(options);

        const issues = response.data;

        for (let i=0; i<issues.length; i++) {
            const issueID = issues[i].number;
            const title = issues[i].title;
            let issueChangedToClosed = await changedToClosed(orgOrUser, repo, issueID, startDate, endDate, cmd);
            if (issueChangedToClosed) {
                toReturn.push({"id":issueID,"title":title});
            }
            if (cmd.debug) {
                console.log(`in getTargetIssues(${orgOrUser}, ${repo}), changedToClosed(${issueID}) is ${issueChangedToClosed}, toReturn is`, toReturn);
            }
        }
        return toReturn;
    } catch (err) {
        // todo distinguish 404, 301, 410?
        if (cmd.debug) console.log(`in getTargetIssues, throwing ${err}`);
        handleErr(err, cmd.uiIsOn); 
    }
}

/**
 * given an array of owner/repo pairs, returns an object where keys are owner/repo pairs, and values are arrays of issues from that owner/repo that satisfied getTargetIssues.
 * part of the queryTargetIssues callchain, which uses time parameters to automatically query issues for a milestone update.
 * @param {*} ownerRepos 
 * @param {*} startDate 
 * @param {*} endDate 
 * @param {*} cmd 
 */
async function multiRepoGetTargetIssues(ownerRepos, startDate, endDate, cmd) {
    try {
        let toReturn = {};
        for (let i=0; i<ownerRepos.length; i++) {
            const ownerRepo = ownerRepos[i];
            const [owner, repo] = ownerRepo.split('/');
            const issuesThatChangedToClosed = await getTargetIssues(owner, repo, startDate, endDate, cmd);
            toReturn[ownerRepo] = issuesThatChangedToClosed;
            if (cmd.debug) {
                console.log(`in multiRepoGetTargetIssues, adding`, issuesThatChangedToClosed, `toReturn is now`, toReturn);
            }
        }
        return toReturn;
    } catch (err) {
        handleErr(err, cmd.uiIsOn);
        throw err;
    }
}

/**
 * queries the issue with the given issueID under orgOrUser/repo and edits its milestone to be the existing milestone with `milestoneID`. returns the milestoneID for normal http responses and false for 300 or 400s.
 * @param {string} orgOrUser 
 * @param {string} repo 
 * @param {number} issueID 
 * @param {number} milestoneID 
 * @param {object} cmd 
 */
async function updateMilestoneOfIssue(orgOrUser, repo, issueID, milestoneID, cmd) {
    try {
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        
        const response = await Issue.editIssue(issueID, {milestone: milestoneID} );
        
        if (cmd.debug) console.log(`in updateMilestoneOfIssue(${orgOrUser}/${repo}/${issueID}) ${response.status} successfully updated milestone ${milestoneID} of issue ${issueID} on ${orgOrUser}/${repo} to have milestone ${milestoneID}`)
        return milestoneID;
    } catch (err) {
        console.log(`in updateMilestoneOfIssue(${milestoneID}): throwing error ${err.response.status} and returning false` );
        return false;
        throw err;
    }
}

async function removeMilestoneFromIssue(orgOrUser, repo, issueID, cmd) {
    try {
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        const getResponse = await Issue.getIssue(issueID);
        const oldMilestoneNumber = getResponse.data.milestone.number;
        if (cmd.debug) console.log(getResponse.data)
        const editResponse = await Issue.editIssue(issueID, {milestone: null} );
        
        if (cmd.debug) console.log(`in updateMilestoneOfIssue(${orgOrUser}/${repo}/${issueID}) ${editResponse.status} successfully removed milestone ${oldMilestoneNumber} of issue ${issueID} on ${orgOrUser}/${repo}`)
        return issueID;
    } catch (err) {
        console.log(`in updateMilestoneOfIssue(${orgOrUser}, ${repo}, ${issueID}): throwing error ${err}` );
        throw err;
    }
}

/**
 * given an orgOrUser and repo and array of issueIDs, set all milestones to null. return array of IDs of edited issues.
 * @param {*} orgOrUser 
 * @param {*} repo 
 * @param {*} issueIDs 
 * @param {*} cmd 
 */
async function multiRemoveMilestoneFromIssue(orgOrUser, repo, issueIDs, cmd) {
    try {
        let toReturn = [];
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        for (let i=0; i<issueIDs.length; i++) {
            const editResponse = await Issue.editIssue(issueIDs[i], {milestone: null} );
            if (cmd.debug) console.log(`in multiRemoveMilestoneFromIssue(${orgOrUser}, ${repo}, ${issueIDs}): issueID is`, editResponse.data.number);
            const issueID = editResponse.data.number;
            toReturn.push(issueID);
        }
        return toReturn;
    } catch (err) {
        console.log(`in multiRemoveMilestoneFromIssue(${orgOrUser}, ${repo}, ${issueIDs}): throwing error ${err}` );
        throw err;
    }
}

/**
 * takes options with owner/repo keys and array-of-issueIDs keys and makes milestones null for each issue in each owner/repo.
 * @param {*} options 
 * @param {*} cmd 
 */
async function multiRepoRemoveMilestoneFromIssue(options, cmd) {
    try {
        let toReturn = {};
        const ownerRepos = Object.keys(options);
        const issueIDsClusters = Object.values(options);
        if (cmd.debug) console.log(`in multiRepoRemoveMilestoneFromIssue, ownerRepos is`, ownerRepos, `and issueIDsClusters is`, issueIDsClusters);

        for (let i=0; i<ownerRepos.length; i++) {
            const ownerRepo = ownerRepos[i];
            const [owner, repo] = ownerRepo.split('/');
            const issueIDs = issueIDsClusters[i];
            const issueIDsWithRemovedMilestone = await multiRemoveMilestoneFromIssue(owner, repo, issueIDs, cmd);
            toReturn[ownerRepo] = issueIDsWithRemovedMilestone;
            if (cmd.debug) console.log(`in multiRepoRemoveMilestoneFromIssue, adding ${issueIDsWithRemovedMilestone}, toReturn is now`, toReturn);
        }
        return toReturn;
    } catch (err) {
        console.log(`in multiRemoveMilestoneFromIssue(${orgOrUser}, ${repo}, ${issueIDs}): throwing error ${err}` );
        throw err;
    }
}

/**
 * DEPRECATED for bad OOP. Does not adhere to SRP. In other words this method is legacy but not legendary :(
 * queries the issue with the given issueID under orgOrUser/repo and edits its milestone to be `newMilestoneTitle` AND creates a new milestone in the repo if one with title `newMilestoneTitle` DNE. returns true for normal http responses and false for 300 or 400s.
 * @param {string} orgOrUser
 * @param {string} repo 
 * @param {number} issueID 
 * @param {string} newMilestoneTitle 
 * @param {object} cmd 
 */
async function deprecatedUpdateMilestoneOfIssue(orgOrUser, repo, issueID, newMilestoneTitle, cmd) {
    try {
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        let milestoneID = undefined;

        milestoneID = await getMilestoneIDByTitle(orgOrUser, repo, newMilestoneTitle, cmd);
        if (!milestoneID)
            milestoneID = await createNewMilestoneInRepo(orgOrUser, repo, newMilestoneTitle, cmd);
        const response = await Issue.editIssue(issueID, {milestone: milestoneID} );
        
        if (cmd.debug) console.log(`in updateMilestoneOfIssue(${orgOrUser}/${repo}/${issueID}) ${response.status} successfully updated milestone ${newMilestoneTitle} of issue ${issueID} on ${orgOrUser}/${repo} to have milestone ${newMilestoneTitle}`)
        return milestoneID;
    } catch (err) {
        console.log(`in updateMilestoneOfIssue(${newMilestoneTitle}): throwing error ${err.response.status} and returning false` );
        return false;
        throw err;
    }
}
/**
 * given an orgOrUser, a single repo, an array of issueIDs, and a newMilestoneTitle, adds a milestone with that title to each issue `i` in `issueIDs`, where `i` exists in `orgOrUser`/`repo`.
 * if some issueID `issue` does not exist under orgOrUser, throw err. returns an array of the issues that were successfully updated.
 * @param {*} orgOrUser 
 * @param {*} repo 
 * @param {*} issueIDs 
 * @param {*} newMilestoneTitle 
 * @param {*} cmd 
 */
async function multiUpdateMilestoneOfIssue(orgOrUser, repo, issueIDs, newMilestoneTitle, cmd) {
    if (!Array.isArray(issueIDs)) throw new Error(`issueIDs must be an array, but is ${typeof issueIDs}`)
    try {
        let issuesUpdated = [];

        let milestoneID = await getMilestoneIDByTitle(orgOrUser, repo, newMilestoneTitle, cmd);
        if (!milestoneID)
            milestoneID = await createNewMilestoneInRepo(orgOrUser, repo, newMilestoneTitle, cmd);

        for (let i=0; i<issueIDs.length; i++) {
            let issueID = issueIDs[i];
            const newMilestoneID = await updateMilestoneOfIssue(orgOrUser, repo, issueID, milestoneID, cmd);
            if (cmd.debug) console.log(`in multiUpdateMilestoneOfIssue(${orgOrUser}/${repo}, ${issueIDs}, ${newMilestoneTitle}): successfully added milestone ${newMilestoneTitle} which has milestoneID ${newMilestoneID} to ${orgOrUser}/${repo}/issues/${issueID}`);
            issuesUpdated.push(issueID);
        }

        return issuesUpdated;
    } catch (err) {
        if (cmd.debug) console.log(`in multiUpdateMilestoneOfIssue(${orgOrUser}/${repo}, ${issueIDs}, ${newMilestoneTitle}): catching error ${err} and returning false` );
        return false;
        throw err;
    }
}

/**
 * takes options object of format
 * const optionsExample = {
        "mwroffo/testrepo":[
            {
                "id":1,
                "title":"my title"
            }
        ],
        "mwroffo/testrepo2":[
            {
                "id":57,
                "title":"some other title"
            },
            {
                "id:58",
                "title":"some third title"
            }
        ]
    } and then runs multiUpdateMilestoneOfIssue for each owner/repo+id, returning an object identical to `options` upon success, or on failure, throw err.
 * @param {*} options 
 * @param {*} newMilestoneTitle 
 * @param {*} cmd 
 */
async function multiReposUpdateMilestoneOfIssues(options, newMilestoneTitle, cmd) {
    if (!(typeof options === 'object')) throw new Error(`options must be an object, but is ${typeof object}`)
    if (!(typeof newMilestoneTitle === 'string')) throw new Error(`newMilestoneTitle must be a string, but is ${typeof newMilestoneTitle}`)
    try {
        const ownerRepos = Object.keys(options);
        const issueIDArrays = Object.values(options);
        let toReturn = {};

        for (let i=0; i<ownerRepos.length; i++) {
            const ownerRepo = ownerRepos[i];
            const [orgOrUser, repo] = ownerRepo.split('/');
            const issueIDs = issueIDArrays[i];
            const issuesUpdated = await multiUpdateMilestoneOfIssue(orgOrUser, repo, issueIDs, newMilestoneTitle, cmd);
            toReturn[ownerRepo] = issuesUpdated;
            if (cmd.debug) console.log(`in multiReposUpdateMilestoneOfIssues: successfully updated ${orgOrUser}/${repo}/${issueIDs} with ${newMilestoneTitle}`);
        }
        return toReturn;
    } catch (err) {
        if (cmd.debug) console.log(`in multiReposUpdateMilestoneOfIssues(${options}, ${newMilestoneTitle}): catching error ${err} and throwing` );
        // return false;
        throw err;
    }
}

async function doBulkMilestoneUpdate(newMilestoneTitle, startDate, endDate, options, cmd) {
    try {
        const updatesDone = await multiReposUpdateMilestoneOfIssues(options, newMilestoneTitle, cmd);
        handlePrint(`Successfully updated milestones to \'${newMilestoneTitle}\'`, cmd.uiIsOn);
        return updatesDone;
    } catch (err) {
        handlePrint(`in doBulkMilestoneUpdate(${newMilestoneTitle}, ${startDate}, ${endDate}, ${OWNER_REPOS}): catching error ${err} and throwing`);
        handleErr(err, cmd.uiIsOn);
    }
}

/**
 * given orgOrUser/repo and a title, creates the new milestone and returns the milestoneID, or else returns the ID of the existing milestone with this title, or throws if err.
 * @param {*} orgOrUser 
 * @param {*} repo 
 * @param {*} newMilestoneTitle 
 * @param {*} cmd
 */
async function createNewMilestoneInRepo(orgOrUser, repo, newMilestoneTitle, cmd) {
    try {
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        const response = await Issue.createMilestone( {title: newMilestoneTitle} );
        const newMilestoneID = response.data.number;
        if (cmd.debug) console.log(`in createNewMilestoneInRepo successfully added milestone ${newMilestoneTitle} to ${orgOrUser}/${repo} with ID ${newMilestoneID}`)
        return newMilestoneID;
    } catch (err) {
        throw err;
    }
}


/**
 * given orgOrUser, repo, and the title of a milestone, returns the ID of that milestone, or false if no such milestone exists or if error.
 * @param {*} orgOrUser 
 * @param {*} repo 
 * @param {*} milestoneTitle 
 * @param {*} cmd 
 */
async function getMilestoneIDByTitle(orgOrUser, repo, milestoneTitle, cmd) {
    try {
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        const response = await Issue.listMilestones();
        const milestones = response.data;
        let idToReturn = false;
        milestones.forEach(milestone => {
            if (milestone.title === milestoneTitle) {
                idToReturn = milestone.number;
            }
            if (cmd.debug) {
                console.log(`in getMilestoneIDByTitle(${milestoneTitle}): ${milestone.title} === ${milestoneTitle} is ${milestone.title === milestoneTitle}. returning ${idToReturn}`);
            }
        });
        return idToReturn;
    } catch (err) {
        console.log(`err.response.status is`, err.response.status);
        if (cmd.debug) console.log(`in createNewMilestoneInRepo(${newMilestoneTitle}): catching error ${err.response.status} and returning false` );
        if (err.response.status === 404)
            return false;
        throw err;
    }
}
/**
 * given orgOrUser/repo and a milestoneID, deletes the milestone in that repo with that ID, returning the ID if successful, or false if that ID does not exist.
 * @param {*} orgOrUser 
 * @param {*} repo 
 * @param {*} milestoneID 
 * @param {*} cmd 
 */
async function deleteMilestoneFromRepo(orgOrUser, repo, milestoneID, cmd) {
    try {
        const gitHub = new Github(GITHUB_CONF);
        const Issue = gitHub.getIssues(orgOrUser, repo);
        const response = await Issue.deleteMilestone(milestoneID);
        if (cmd.debug) {
            if (response.status === 204) console.log(`in deleteMilestoneFromRepo: successfully removed milestone with ID ${milestoneID} from ${orgOrUser}/${repo}`);
            else console.log(`in deleteMilestoneFromRepo: unexpected status: ${response.status} while response is ${response}`);
        } return milestoneID;
    } catch (err) {
        if (cmd.debug) console.log(`in deleteMilestoneFromRepo: throwing error ${err.response.status} and returning false`);
        return false;
        throw err;
    }
}
function getTargetIssuesString(options, cmd) {
    let toReturn = '';
    const ownerRepos = Object.keys(options)
    const issueObjArrays = Object.values(options);
    if (cmd.debug) console.log(`in getTargetIssuesString, options parameter is`, options, `ownerRepos is`, ownerRepos, `issueObjArrays is`, issueObjArrays);
    
    for (let i=0; i<ownerRepos.length; i++) {
        toReturn = toReturn + `<strong>${ownerRepos[i]}</strong>:<br>`;
        const issues = issueObjArrays[i];
        for (let j=0; j<issues.length; j++) {
            const issue = issues[j];
            toReturn += ` ${issue.id} \'${issue.title}\'<br>`;
            if (cmd.debug) console.log(`in getTargetIssuesString inner loop, ownerRepo is ${ownerRepos[i]} issue.id is`, issue.id, `toReturn is`, toReturn)
        }
        toReturn += '<br>';
    }
    return toReturn;
}

// if this module is imported somewhere else, do not run CLI setup. take care that this does not cause problems with test-suites.
if (!module.parent) {
    setupCLI();
}
module.exports.multijira2github = multijira2github;
module.exports.fetchXML = fetchXML;
module.exports.convertXMLIssue2GithubIssue = convertXMLIssue2GithubIssue;
module.exports.postIssue = postIssue;
module.exports.isOpen = isOpen;
module.exports.openedByDate = openedByDate;
module.exports.isOpenAndOpenedByDate = isOpenAndOpenedByDate;
module.exports.updateMilestoneOfIssue = updateMilestoneOfIssue;
module.exports.createNewMilestoneInRepo = createNewMilestoneInRepo;
module.exports.getMilestoneIDByTitle = getMilestoneIDByTitle;
module.exports.deleteMilestoneFromRepo = deleteMilestoneFromRepo;
module.exports.multiUpdateMilestoneOfIssue = multiUpdateMilestoneOfIssue;
module.exports.multiReposUpdateMilestoneOfIssues = multiReposUpdateMilestoneOfIssues;
module.exports.changedToClosed = changedToClosed;
module.exports.getTargetIssues = getTargetIssues; // gets target issues for single repo
module.exports.multiRepoGetTargetIssues = multiRepoGetTargetIssues; // runs getTargetIssues on multiple repos
module.exports.doBulkMilestoneUpdate = doBulkMilestoneUpdate;
module.exports.removeMilestoneFromIssue = removeMilestoneFromIssue;
module.exports.multiRemoveMilestoneFromIssue = multiRemoveMilestoneFromIssue;
module.exports.multiRepoRemoveMilestoneFromIssue = multiRepoRemoveMilestoneFromIssue;
module.exports.handleErr = handleErr;
module.exports.handlePrint = handlePrint;
module.exports.getTargetIssuesString = getTargetIssuesString;
module.exports.getIssueTitleByID = getIssueTitleByID;
module.exports.reloadAuth = reloadAuth;