module.exports = postIssue;
const GitHub = require('github-api');
const GITHUB_AUTH = {
    username:'mwroffo',
    password:'Laper9133'
}

/*
* Posts the {GithubIssue} to GitHub
* @param {GithubIssue} [github_issue] - a json object specifying the issue to be posted to github.
* @return {Promise} - the promise for the http request to the github api.
*/
function postIssue(issue, org_or_user, repo) {
    // post the issue:
    console.log(`POSTING ISSUE:`);
    console.log(issue);

    const gh = new GitHub(GITHUB_AUTH);

    // `Issue` wrapper, which extends `Requestable`, which encapsulates 
    // a username/password pair or oauth token for github
    const Issue = gh.getIssues(GITHUB_AUTH.username, repo);
    Issue.createIssue(issue).then(data => console.log(data)).catch(err => {throw err;});
}