// Copy this file as config.js then replace with your login credentials
// Make sure that config.js is in .gitignore!!!
const keytar = require('keytar');

async function getAuth() {
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
}
module.exports.OWNER_REPOS = "zowe/zlux zowe/zlux-editor mwroffo/testrepo mwroffo/testrepo2 mwroffo/testrepo3";
module.exports.getAuth = getAuth;