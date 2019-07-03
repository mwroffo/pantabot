# pantabot
We want Zowe to be an open-source project; but keeping the open-source community updated on internal progress produces hours of tedium for project managers like Nolan Rogers and Scrum Masters like Reet Chowdhary who have to fill out GitHub issues manually. This tool (eventually a bot, perhaps) automates the process of creating GitHub issues by fetching XML metadata for selected Jira issues, converting them into GitHub-friendly JSON issues, and posting them to a corresponding repo under a specified organization or user on GitHub.

## install:
* install nodejs _globally_ on your machine: https://nodejs.org/en/download/
* run `node --version` from your terminal to confirm that NodeJS v7.10.1 or newer is installed (https://node.green/#ES2017).
* clone this repo: `git clone git@github.com:mwroffo/pantabot.git`
* run `npm i`
* should be good to go, but if not, please open an issue with a screenshot of your error message.

## usage:
notation: <required_arg> [optional_arg]
Port a specified Jira issue into Github:
`node panta j2g <USERNAME_OR_ORGANIZATION> <REPO> <JIRA_ISSUE_CODE> [MORE_JIRA_ISSUE_CODES...]`

## namesake:
Zoe == 'wisdom' in Greek, panta == 'for all', thus zowe panta == 'wisdom for all'. @ActualSpeakersOfGreek please forgive errors.
