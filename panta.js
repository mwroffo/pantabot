'use strict';

const JiraIssuePuller = require('./jira-issue-puller');
const Jira2GithubConverter = require('./jira-to-github-converter');
const program = require('commander');
const pkg = require('./package.json')

function setupCLI() {
    program
        .version(pkg.version)
        .description(pkg.description)
        .usage('[options] <command> [...]');
    program
        .command('j2g <JIRA_ISSUE_CODE> <USERNAME_OR_ORGANIZATION> <REPO>')
        .description('Given a Jira issue as \'MVD-3048\', \'MVD-3051\', etc., posts that Jira issue to the specified zowe repo on GitHub.')
        .action(JiraIssuePuller.fetchXML);
    program.parse(process.argv);
    if (!program.args.filter(arg => typeof arg === 'object').length) {
        // if bad args,
        program.help(); // show help
    }
    
}

// if this module is imported somewhere else, do not run main
if (!module.parent) {
    setupCLI();
}