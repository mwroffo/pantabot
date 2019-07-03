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

function setupCLI() {
    program
        .version(pkg.version)
        .description(pkg.description)
        .usage('[options] <command> [...]');
    program
        .command('j2g <issue_id> <orgOrUser> <repo>')
        .description('Given a Jira issue as \'MVD-<id>\', posts that issue to <orgOrUser>/<repo>.')
        .action(jira2github);
    program
        .command('get-user')
        .description('Prints information about a given github user.')
        .action(getUser);
    program.parse(process.argv);
    if (!program.args.filter(arg => typeof arg === 'object').length) {
        // if bad args,
        program.help(); // show help
    }
}

/**
 * action function for j2g command runs fetchXML, convertXMLIssue2GithubIssue, then postIssue.
 * @param {} issue_id 
 * @param {*} orgOrUser 
 * @param {*} repo 
 */
async function jira2github(issue_id, orgOrUser, repo) {
    const jira_issue_xml = await fetchXML(issue_id);
    const github_issue_json = convertXMLIssue2GithubIssue(jira_issue_xml);
    try {
        const response = await postIssue(github_issue_json, orgOrUser, repo);
    } catch (err) {throw err;}
}

/* 
* Takes a jira.rocketsoftware.com issue id and returns the issue in xml form
* @param {string} [issue_id] the issue's id, for example MVD-3017
*/

async function fetchXML(issue_id) {
    // issue_id = process.argv[3];
    const url = `https://jira.rocketsoftware.com/si/jira.issueviews:issue-xml/${issue_id}/${issue_id}.xml`;
    
    const options = {
        url: url,
        headers: {'User-Agent':'mwroffo'}
    }
    try {
        const res = await RequestPromise.get(options).auth(JIRA_AUTH.username, JIRA_AUTH.password);
        console.log(`(1) FETCHING XML from ${url}`);
        return res;
    } catch (err) {throw err;}
}

/*
* maps fields in a jira issue to similar fields in a github issue
* @param {JiraIssue} [jira_issue] - the Jira issue to be converted
* @return {GithubIssue} - a json object with fields corresponding to github fields.
*/

function convertXMLIssue2GithubIssue(body_xml) {
    let githubissue = {};
    const $ = cheerio.load(body_xml, {xml: {normalizeWhitespace: true}});
    githubissue.title = $('item title').text();
    githubissue.body = $('item description').text();
    // jira allows one assignee whereas github allows an array of assignees
    githubissue.assignees = [$('item assignee').text()];
    githubissue.labels = $('item labels').toArray().map(elem => $(elem).text());

    // TODO june27 2019 labels should appear as strings in separate array indices

    console.log(`(2) ISSUE CONVERTED`, githubissue);
    return githubissue;
}

/*
* Posts the {GithubIssue} to GitHub
* @param {GithubIssue} [github_issue] - a json object specifying the issue to be posted to github.
* @return {Promise} - the promise for the http request to the github api.
*/
async function postIssue(issue, orgOrUser, repo) {
    const gitHub = new Github(GITHUB_AUTH);
    try {
        console.log(`(3) POSTING ISSUE to %s/%s`, orgOrUser, repo);
        let json_response = {};
        const Issue = gitHub.getIssues(orgOrUser, repo);
        json_response = await Issue.createIssue(issue);
        console.log(`(4) POST ISSUE RESPONSE`, json_response);
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