module.exports.convert2GithubIssue = convert2GithubIssue;
module.exports.handleXML = handleXML;
const GithubIssuePusher = require('./github-issue-pusher.js');
const cheerio = require('cheerio');

/*
* maps fields in a jira issue to similar fields in a github issue
* @param {JiraIssue} [jira_issue] - the Jira issue to be converted
* @return {GithubIssue} - a json object with fields corresponding to github fields.
*/
function convert2GithubIssue(jira_issue) {
    const github_issue = {
        title: "test title",
        body: jira_issue.fields.description,
        assignees: ["test assignee"],
        labels: ["bug"]
    }
    return github_issue;
}

function handleXML(err,response,body_xml) {
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
        console.log(`ISSUE CONVERTED ${githubissue}`);
        const username_or_org = progress.argv[4];
        const repo = process.argv[5];
        GithubIssuePusher.postIssue(githubissue, username_or_org, repo);
    }
}