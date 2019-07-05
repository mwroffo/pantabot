'use strict';

const Github = require('github-api');
const cheerio = require('cheerio');
const program = require('commander');
const RequestPromise = require('request-promise');
const Request = require('request');
const Octokit = require('@octokit/rest');

const GITHUB_AUTH = require('./myauth.js').GITHUB_AUTH;
const JIRA_AUTH = require('./myauth.js').JIRA_AUTH_BASIC;
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
 * action function for j2g command runs fetchXML, convertXMLIssue2GithubIssue, then postIssue.
 * @param {} issueID 
 * @param {*} orgOrUser 
 * @param {*} repo 
 */
async function multijira2github(orgOrUser, repo, issueID, otherIssueIDs, cmd) {
    // the commander.js docs demonstrate variadic args with one as required and others as optional
    // (https://github.com/tj/commander.js#variadic-arguments)
    otherIssueIDs.unshift(issueID); // combine into one array.
    if (otherIssueIDs) {
        otherIssueIDs.forEach(async issueID => {
            const jira_issue_xml = await fetchXML(issueID, cmd);
            const github_issue_json = convertXMLIssue2GithubIssue(jira_issue_xml, cmd);
            try {
                const response = await postIssue(github_issue_json, orgOrUser, repo, cmd);
            } catch (err) {throw err;}
        });
    }
    console.log(`panta is posting ${otherIssueIDs.length} issues to ${orgOrUser}/${repo}.`)
}

async function convertIssue(issueID) {
    const jira_issue_xml = await fetchXML(issueID);
    const github_issue_json = convertXMLIssue2GithubIssue(jira_issue_xml);
}

/* 
* Takes a jira.rocketsoftware.com issue id and returns the issue in xml form
* @param {string} [issueID] the issue's id, for example MVD-3017
*/

async function fetchXML(issueID, cmd) {
    const url = `https://jira.rocketsoftware.com/si/jira.issueviews:issue-xml/${issueID}/${issueID}.xml`;
    
    const options = {
        url: url,
        headers: {'User-Agent':'mwroffo'}
    }
    try {
        const res = await RequestPromise.get(options).auth(JIRA_AUTH.username, JIRA_AUTH.password);
        if (cmd.debug) console.log(`(1) FETCHING XML from ${url}`);
        return res;
    } catch (err) {throw err;}
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

    if (cmd.debug) console.log(`(2) ISSUE CONVERTED`, githubissue);
    return githubissue;
}

/*
* Posts the {GithubIssue} to GitHub
* @param {GithubIssue} [github_issue] - a json object specifying the issue to be posted to github.
* @return {Promise} - the promise for the http request to the github api.
*/
async function postIssue(issue, orgOrUser, repo, cmd) {
    const gitHub = new Github(GITHUB_AUTH);
    try {
        if (cmd.debug) {
            console.log(`(3) POSTING ISSUE to %s/%s`, orgOrUser, repo);
        }
        let json_response = {};
        const Issue = gitHub.getIssues(orgOrUser, repo);
        if (cmd.post) {
            json_response = await Issue.createIssue(issue);
            const public_url = json_response.data.url.replace(/api\./g,'').replace(/\/repos/g,'')
            console.log(`(4) POST ISSUE RESPONSE`, json_response.data.title, '\t\t', public_url);
        } else { console.log(`--no-post option is set. not posting ${issue.title}`)}
        return json_response;
    } catch (err) {throw err;}
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
            if (err) throw err;
            console.log(res.statusCode, body);
        })
        .auth(GITHUB_AUTH.username, GITHUB_AUTH.password) // 200 resp
        // .auth(null, null, false, GITHUB_AUTH.bearer); // 401 requires auth
        
        // method2 gets 401
        // let json_response = {};
        // json_response = await RequestPromise.get(options).auth(GITHUB_AUTH.username, GITHUB_AUTH.password, false, GITHUB_AUTH.bearer);
        // json_response = await octokit.users.listNotifications(all=true);
        // console.log(`getuser response`, json_response);
        // return json_response;
    } catch (err) {throw err;}
}

// if this module is imported somewhere else, do not run main
if (!module.parent) {
    setupCLI();
}