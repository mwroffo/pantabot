const keytar = require('keytar');

async function getAuth() {
    try {
        let JIRA_CONF = {};
        JIRA_CONF.BASE_URI = "jira.rocketsoftware.com";
        JIRA_CONF.username = "mroffo";
        const jiraPassword = await keytar.getPassword('jira', JIRA_CONF.username);
        JIRA_CONF.password = jiraPassword;
        let GITHUB_CONF = {};
        GITHUB_CONF.username = "mwroffo";
        const githubPassword = await keytar.getPassword('github', GITHUB_CONF.username);
        GITHUB_CONF.password = githubPassword;
        let toReturn = [];
        toReturn.push(JIRA_CONF, GITHUB_CONF);
        return toReturn;
    } catch (err) {throw err}
}
module.exports.OWNER_REPOS = "mwroffo/testrepo mwroffo/testrepo2 mwroffo/testrepo3";
module.exports.getAuth = getAuth;