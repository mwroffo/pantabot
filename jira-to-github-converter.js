module.exports.convertXMLIssue2GithubIssue = convertXMLIssue2GithubIssue;
const GithubIssuePusher = require('./github-issue-pusher.js');
const cheerio = require('cheerio');

/*
* maps fields in a jira issue to similar fields in a github issue
* @param {JiraIssue} [jira_issue] - the Jira issue to be converted
* @return {GithubIssue} - a json object with fields corresponding to github fields.
*/

// TODO needs to wait until body_xml is not empty...
function convertXMLIssue2GithubIssue(body_xml) {
    let githubissue = {};
    const $ = cheerio.load(body_xml, {xml: {normalizeWhitespace: true}});
    githubissue.title = $('item title').text();
    githubissue.body = $('item description').text();
    // jira allows one assignee whereas github allows an array of assignees
    githubissue.assignees = [$('item assignee').text()];
    githubissue.labels = $('item labels').toArray().map(elem => $(elem).text());

    // TODO june27 2019 labels should appear as strings in separate array indices
    
    // post github issue
    console.log(`(2) ISSUE CONVERTED`, githubissue);
    return githubissue;
}