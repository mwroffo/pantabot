const request = require('request');
const GitHub = require('github-api');
const token = '5cff57b4aa4f58530714a77a707616f33136f1b0';
const Base64 = require('js-base64');
let test_xml;
class Jira2Github {

    // TODO constructor (what are the JS practices?)

    /*
    * maps fields in a jira issue to similar fields in a github issue
    * @param {JiraIssue} [jira_issue] - the Jira issue to be converted
    * @return {GithubIssue} - a json object with fields corresponding to github fields.
    */
    convert2GithubIssue(jira_issue) {
        const github_issue = {
            title: "test title",
            body: jira_issue.fields.description,
            assignees: ["test assignee"],
            labels: ["bug"]
        }
        return github_issue;
    }

    /*
    * Posts the {GithubIssue} to GitHub
    * @param {GithubIssue} [github_issue] - a json object specifying the issue to be posted to github.
    * @return {Promise} - the promise for the http request to the github api.
    */
    postIssue(issue) {
        // post the issue:
        console.log(`posting issue:`);
        console.log(issue);

        const gh = new GitHub({
            username: 'mwroffo',
            password: 'Laper9133'
        });
        const issues = gh.getIssues('zowe', 'file-transfer-app');
        issues.createIssue(issue).then(data => console.log(data)).catch(err => {throw err;});
    }

    /* 
    * Takes a jira.rocketsoftware.com issue id and returns the issue in xml form
    * @param {string} [issue_id] the issue's id, for example MVD-3017
    */
    fetchXML(issue_id, cb) {
        const url = `https://jira.rocketsoftware.com/si/jira.issueviews:issue-xml/${issue_id}/${issue_id}.xml`;

        const options = {
            url: url,
            headers: { 'User-Agent':''}
        }
        request.get(options, cb).auth('mroffo','Laper9133');
    }
}

module.exports = Jira2Github;

// TEST CLIENT
function main() {
    // parse jira_issue object to JSON
    const jira_issue = require('./' + process.argv[2]);
    const jira2Github = new Jira2Github();
    let test_xml;
    jira2Github.fetchXML('MVD-3017', (err,response,body) => {
        if (err) throw err;
        else {
            test_xml = body;
            console.log(test_xml);
        }
    });
    // const github_issue = jira2Github.convert2GithubIssue(jira_issue);
    // jira2Github.postIssue(github_issue); // post issue to github
}
main();