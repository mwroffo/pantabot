'use strict';

const { dialog } = require('electron');
const UI = require("./ui.js");
const Github = require('github-api');
const cheerio = require('cheerio');
const program = require('commander');
const RequestPromise = require('request-promise');
const Request = require('request');
const Octokit = require('@octokit/rest');

const GITHUB_CONF = require('./config.js').GITHUB_CONF;
const JIRA_CONF = require('./config.js').JIRA_CONF;
const pkg = require('./package.json');
const USERNAMES_MAP = require('./usernames-map.json');

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
    const alreadyExistingIssues = await listIssues(orgOrUser, repo); // returns an array of issues. titles don't include prefixes.
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
                        handlePrint(`(DONE) Panta posted \'${json_response.data.title}\' to ${public_url}`, "info");
                        postResponses.push(json_response);
                    } else { handlePrint(`skipping issue '${duplicate.title}' because it already exists at https//github.com/${orgOrUser}/${repo}/issues/${duplicate.number}`, "info") }  
                } else { handlePrint(`--no-post option is set. Issues and their comments do not post. '${githubIssueJSON.title}'`, "info") }
            } catch (err) {handleErr(err);}
        });
    }
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
        if (cmd.debug) console.log(`(1) FETCHING XML from ${url}`);
        return res;
    } catch (err) {handleErr(err);}
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
    githubissue.body = $('item description').text();

    githubissue.labels = $('item labels label').toArray().map(elem => $(elem).text());

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
    } catch (err) {handleErr(err);}
}

async function listIssues(orgOrUser, repo) {
    try {
        const github = new Github(GITHUB_CONF);
        const Issue = github.getIssues(orgOrUser, repo);
        let issues = await Issue.listIssues();
        return issues.data;
    } catch (err) { handleErr(err) }
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
            if (err) handleErr(err);
            console.log(res.statusCode, body);
        })
        .auth(GITHUB_CONF.username, GITHUB_CONF.password) // 200 resp
        // .auth(null, null, false, GITHUB_CONF.bearer); // 401 requires auth
        
        // method2 gets 401
        // let json_response = {};
        // json_response = await RequestPromise.get(options).auth(GITHUB_CONF.username, GITHUB_CONF.password, false, GITHUB_CONF.bearer);
        // json_response = await octokit.users.listNotifications(all=true);
        // console.log(`getuser response`, json_response);
        // return json_response;
    } catch (err) {handleErr(err);}
}

function handlePrint(string, messageBoxType) {
    console.log(string); // console print
    if (module.parent) { // show dialog if UI exists
        dialog.showMessageBox({
        type: messageBoxType,
        message: string
        })
    }
}

function handleErr(err) {
    if (module.parent) { // show dialog if UI exists
        dialog.showMessageBox({
        type: "error",
        message: `${err.name} ${err.message}`
        });
    }
    throw err;
}

// if this module is imported somewhere else, do not run main
if (!module.parent) // i.e. when not running from `electron .`, set up the CLI.
    setupCLI();
else UI.buildUI(); // otherwise, set up the UI.

module.exports.multijira2github = multijira2github;
