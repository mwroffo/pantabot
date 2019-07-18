'use strict';

const { dialog } = require('electron');
const Github = require('github-api');
const cheerio = require('cheerio');
const program = require('commander');
const RequestPromise = require('request-promise');
const Request = require('request');
const J2G_USERNAME_MAP = require('./j2g-username-map');

const GITHUB_CONF = require('./config.js').GITHUB_CONF;
const JIRA_CONF = require('./config.js').JIRA_CONF;
const pkg = require('./package.json');

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

async function convertIssue(issueID) {
    const jiraIssueXML = await fetchXML(issueID);
    const githubIssueJSON = convertXMLIssue2GithubIssue(jiraIssueXML);
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
        const gitHub = new Github(GITHUB_CONF);
        if (cmd.debug) {
            console.log(`(3) POSTING ISSUE to %s/%s`, orgOrUser, repo);
        }
        let json_response = {};
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

function electronIsParent() {
    // when panta.js was "main" in package.json, module.parent.filename was:
    // 'C:\\Users\\mroffo\\zowe\\pantabot\\node_modules\\electron\\dist\\resources\\default_app.asar\\main.js'
    let toReturn = false;
    if (module.parent) {
        // when launching from `npm start`, this is true
        if (module.parent.filename === 'C:\\Users\\mroffo\\zowe\\pantabot\\ui.js')
            return true;
        else {
            dialog.showMessageBox( {type:"info", message:`module.parent exists and is ${module.parent.filename}`} )
            console.log('module.parent exists but is not electron: module.parent is', module.parent.filename);
            return false;
        }
    } else {
        dialog.showMessageBox( {type:"info", message: "electronIsParent: module.parent DNE"} )
        console.log('electronIsParent: module.parent does not exist');
        return false;
    }
}

// if this module is imported somewhere else, do not run main. take care that this does not cause problems with test-suites.
if (!module.parent) {
    setupCLI();
}
module.exports.multijira2github = multijira2github;
module.exports.fetchXML = fetchXML;
module.exports.convertXMLIssue2GithubIssue = convertXMLIssue2GithubIssue;
module.exports.postIssue = postIssue;