const keytar = require('keytar');

async function getAuth() {
    try {
        let JIRA_CONF = {};
        JIRA_CONF.BASE_URI = "jira.organization.com";
        JIRA_CONF.username = "jsmith";
        const jiraPassword = await keytar.getPassword('jira', JIRA_CONF.username);
        JIRA_CONF.password = jiraPassword;
        let GITHUB_CONF = {};
        GITHUB_CONF.username = "jwsmith";
        const githubPassword = await keytar.getPassword('github', GITHUB_CONF.username);
        GITHUB_CONF.password = githubPassword;
        let toReturn = [];
        toReturn.push(JIRA_CONF, GITHUB_CONF);
        return toReturn;
    } catch (err) {throw err}
}
module.exports.OWNER_REPOS = " octokit/rest.js";
module.exports.getAuth = getAuth;