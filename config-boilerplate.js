// Copy this file as config.js then replace with your login credentials
// Make sure that config.js is in .gitignore!!!
const keytar = require('keytar');

let JIRA_CONF = {};
JIRA_CONF.username = 'jsmith';
keytar.getPassword('jira', JIRA_CONF.username).then(password => JIRA_CONF.password = password);
let GITHUB_CONF = {};
GITHUB_CONF.username = 'jappleseed';
keytar.getPassword('github', GITHUB_CONF.username).then(password => GITHUB_CONF.password = password);

module.exports.JIRA_CONF = JIRA_CONF;
module.exports.GITHUB_CONF = GITHUB_CONF;