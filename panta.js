'use strict';

const JiraIssuePuller = require('./jira-issue-puller');
const Jira2GithubConverter = require('./jira-to-github-converter');
const GithubIssuePusher = require('./github-issue-pusher');
const program = require('commander');
const pkg = require('./package.json')

function setupCLI() {
    program
        .version(pkg.version)
        .description(pkg.description)
        .usage('[options] <command> [...]');
    program
        .command('j2g <issue_id> <org_or_user> <repo>')
        .description('Given a Jira issue as \'MVD-<id>\', posts that issue to <org_or_user>/<repo>.')
        .action(jira2github);
    program.parse(process.argv);
    if (!program.args.filter(arg => typeof arg === 'object').length) {
        // if bad args,
        program.help(); // show help
    }
}

async function jira2github(issue_id, org_or_user, repo) {
    const jira_issue_xml = await JiraIssuePuller.fetchXML(issue_id);
    const github_issue_json = Jira2GithubConverter.convertXMLIssue2GithubIssue(jira_issue_xml);
    try {
        const response = await GithubIssuePusher.postIssue(github_issue_json, org_or_user, repo);
    } catch (err) {throw err;}
}

// if this module is imported somewhere else, do not run main
if (!module.parent) {
    setupCLI();
}