const request = require('request');
module.exports.fetchXML = fetchXML;
const JIRA_AUTH = {
    username:'mroffo',
    password:'Laper9133'
}
/* 
* Takes a jira.rocketsoftware.com issue id and returns the issue in xml form
* @param {string} [issue_id] the issue's id, for example MVD-3017
*/
function fetchXML(issue_id, handleXML) {
    const url = `https://jira.rocketsoftware.com/si/jira.issueviews:issue-xml/${issue_id}/${issue_id}.xml`;
    const options = {
        url: url,
        headers: { 'User-Agent':''}
    }
    request.get(options, handleXML).auth(JIRA_AUTH.username, JIRA_AUTH.password);
}