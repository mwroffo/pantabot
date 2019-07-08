# pantabot
Keeping the open-source community updated on project progress produces hours of tedium for project managers and scrum masters (or developers who use a Jira instance) who have to fill out GitHub issues manually. This tool (eventually a bot, perhaps) automates the process of creating GitHub issues by fetching XML metadata for selected Jira issues, converting them into GitHub-friendly JSON issues, and posting them to a corresponding repo under a specified organization or user on GitHub.

## install:
* install nodejs _globally_ on your machine: https://nodejs.org/en/download/
* run `node --version` from your terminal to confirm that NodeJS v7.10.1 or newer is installed (https://node.green/#ES2017).
* clone this repo: `git clone git@github.com:mwroffo/pantabot.git`
* run `npm i`
* should be good to go, but if not, please open an issue with a screenshot of your error message.

## usage:
notation: <required_arg> [optional_arg]
Port a specified Jira issue into https://github.com/<GITHUB_USERNAME_OR_ORGANIZATION>/<REPO>
`node panta j2g <GITHUB_USERNAME_OR_ORGANIZATION> <REPO> <JIRA_ISSUE_CODE> [MORE_JIRA_ISSUE_CODES...]`
Example: `node panta j2g zowe zlux MVD-3048 MVD-3060`
Note: 'MVD-####' are Jira project keys.
Note: <GITHUB_USERNAME_OR_ORGANIZATION> <REPO> indicate the owner and repo where your jira issues will post. Specifiy authentication in auth.js.

## namesake:
Zoe == 'wisdom' in Greek, panta == 'for all', thus zowe panta == 'wisdom for all'. @ActualSpeakersOfGreek please forgive errors.
