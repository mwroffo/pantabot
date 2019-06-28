

const JiraIssuePuller = require('./jira-issue-puller');
const Jira2GithubConverter = require('./jira-to-github-converter');

function main() {
    JiraIssuePuller.fetchXML('MVD-3049', Jira2GithubConverter.handleXML);
}

// if this module is imported somewhere else, do not run main
if (!module.parent) {
    main();
}