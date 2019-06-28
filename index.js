const request = require('request');
const GitHub = require('github-api');
const Base64 = require('js-base64');
const cheerio = require('cheerio');
const JIRA_AUTH = {
    username:'mroffo',
    password:'Laper9133'
}
const GITHUB_AUTH = {
    username:'mwroffo',
    password:JIRA_AUTH.password
}
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
    postIssue(issue, org_or_user, repo) {
        // post the issue:
        console.log(`POSTING ISSUE:`);
        console.log(issue);

        const gh = new GitHub(GITHUB_AUTH);
        
        // `Issue` wrapper, which extends `Requestable`, which encapsulates 
        // a username/password pair or oauth token for github
        const Issue = gh.getIssues(GITHUB_AUTH.username, repo);
        Issue.createIssue(issue).then(data => console.log(data)).catch(err => {throw err;});
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
        request.get(options, cb).auth(JIRA_AUTH.username, JIRA_AUTH.password);
    }
}

module.exports = Jira2Github;

// TEST CLIENT
function main() {
    // parse jira_issue object to JSON
    // const jira_issue = require('./' + process.argv[2]);
    const jira2Github = new Jira2Github();
    jira2Github.fetchXML('MVD-3049', (err,response,body_xml) => {
        if (err) throw err;
        else {
            // convertXMLIssue2GithubIssue
            let githubissue = {};
            // console.log(body_xml);
            const $ = cheerio.load(body_xml, {xml: {normalizeWhitespace: true}});
            githubissue.title = $('item title').text();
            // TODO remove html tags from body
            githubissue.body = $('item description').text();
            // jira allows one assignee whereas github allows an array of assignees
            githubissue.assignees = [$('item assignee').text()];
            // dense, but each label element must be convert to string separately:
            githubissue.labels = $('item labels').toArray().map(elem => $(elem).text());
            // console.log('RESULTING GITHUB ISSUE IS:\n', githubissue);
            // TODO june27 2019 labels should appear as strings in separate array indices
            
            // post github issue
            jira2Github.postIssue(githubissue, process.argv[2], process.argv[3]);
        }
    });
    // const github_issue = jira2Github.convert2GithubIssue(jira_issue);
    // jira2Github.postIssue(github_issue); // post issue to github
}

// if this module is imported somewhere else, do not run main
if (!module.parent) {
    main();
}