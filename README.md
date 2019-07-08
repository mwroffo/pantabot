# Panta.js
Given login credentials for (1) Jira and (2) Github, a USER_OR_ORGANIZATION, a REPO, and a list of valid Jira issue IDs, panta posts the issues (including titles, descriptions, and labels) to https://github.com/USER_OR_ORGANIZATION/REPO.

## Install:
* install nodejs _globally_ on your machine: https://nodejs.org/en/download/
* run `node --version` from your terminal to confirm that NodeJS v7.10.1 or newer is installed (https://node.green/#ES2017).
* clone this repo: `git clone git@github.com:mwroffo/pantabot.git`
* run `npm i`
* should be good to go, but if not, please open an issue with a screenshot of your error message.

## Configuration:
* Copy config-boilerplate.js as config.js and substitute (1) your valid login for Jira server or Jira cloud, as well as (2) your valid GitHub login.
* In the `fetchXML` function in `panta.js`, edit the `url` variable to reflect your Jira instance's XML `HTTPS GET` link.

## Usage:
notation: <required_arg> [optional_arg]
Port a specified Jira issue into https://github.com/<GITHUB_USERNAME_OR_ORGANIZATION>/<REPO>
`node panta j2g <GITHUB_USERNAME_OR_ORGANIZATION> <REPO> <JIRA_ISSUE_CODE> [MORE_JIRA_ISSUE_CODES...]`
Example: `node panta j2g zowe zlux MVD-3048 MVD-3060`
Note: 'MVD' is an example of a project prefix.
Note: <GITHUB_USERNAME_OR_ORGANIZATION> <REPO> indicate the owner and repo where your jira issues will POST; this username is not to be confused with your authentication username.

## Namesake:
Zoe == 'wisdom' in Greek, panta == 'for all', thus zowe panta == 'wisdom for all'. @ActualSpeakersOfGreek please forgive errors.
