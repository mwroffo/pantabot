const request = require('request');
const token = '5cff57b4aa4f58530714a77a707616f33136f1b0';

// read some issue syncronously from a json file:
const filename = process.argv[2];
const issue = require('./' + filename);

// build a url
const url = `https://api.github.com/repos/mwroffo/pantabat/issues`;
const username = "mwroffo";
const password = "Laper9133";

// post the issue:
// console.log(`posting this issue to ${url}:\n`);
// console.log(issue);

console.log(`getting issues from ${url}`)

const options = {
    method: 'GET',
    url: url,
    'auth': {
        'user':username,
        'pass':password,
        'sendImmediately':false
    },
    headers: {
        'Content-Type': 'application/json',
        'User-Agent':''
    }
}

request.get(options, (err,res,body) => {
    if (err) throw new Error(err);
    console.log(
       'Response: ' + res.statusCode + ' ' + res.statusMessage
    );
    console.log(body);
})

// TODO flesh out a more complete class
// TODO some function must convert a jira_issue_obj into a github_friendly_issue_obj
// TODO types should be specified for `GithubIssue` vs `JiraIssue`.