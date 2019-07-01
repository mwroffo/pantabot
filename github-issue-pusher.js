module.exports.postIssue = postIssue;
const GitHub = require('github-api');
const RequestPromise = require('request-promise');
const GITHUB_AUTH = require('./myauth.js').GITHUB_AUTH_BASIC;

/*
* Posts the {GithubIssue} to GitHub
* @param {GithubIssue} [github_issue] - a json object specifying the issue to be posted to github.
* @return {Promise} - the promise for the http request to the github api.
*/
async function postIssue(issue, org_or_user, repo) {
    const url = `https://api.github.com/repos/${org_or_user}/${repo}/issues`;
    const options = {
        url: url,
        headers: { 'User-Agent':'mwroffo' }
    }
    try {
        // post the issue:
        console.log(`(3) POSTING ISSUE %s to %s/%s`, issue, org_or_user, repo);
        const json_response = {}
        json_response = await RequestPromise.post(options).auth(GITHUB_AUTH.username, GITHUB_AUTH.password, false);
        console.log(`(4) POST ISSUE RESPONSE`, json_response);
        return json_response;
    } catch (err) {throw err;}
}