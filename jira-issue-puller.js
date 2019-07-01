const rp = require('request-promise');
module.exports.fetchXML = fetchXML;
const JIRA_AUTH = require('./myauth.js').JIRA_AUTH_BASIC;

/* 
* Takes a jira.rocketsoftware.com issue id and returns the issue in xml form
* @param {string} [issue_id] the issue's id, for example MVD-3017
*/

async function fetchXML(issue_id) {
    // issue_id = process.argv[3];
    const url = `https://jira.rocketsoftware.com/si/jira.issueviews:issue-xml/${issue_id}/${issue_id}.xml`;
    console.log(`fetching xml from ${url}`);
    const options = {
        url: url,
        headers: { 'User-Agent':'' }
    }
    return await rp.get(options).auth(JIRA_AUTH.username, JIRA_AUTH.password);
}