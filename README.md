# Panta.js
Given login credentials for (1) Jira and (2) Github, a USER_OR_ORGANIZATION, a REPO, and a list of valid Jira issue IDs, panta posts the issues (including titles, descriptions, and labels) to https://github.com/USER_OR_ORGANIZATION/REPO.

## Install:
* install [nodejs](https://nodejs.org/en/download/) _globally_ on your machine: 
* run `node --version` from your terminal to confirm that [NodeJS v7.10.1](https://node.green/#ES2017) or newer is installed .
* clone this repo: `git clone git@github.com:mwroffo/pantabot.git`
* run `npm i`
* should be good to go, but if not, please open an issue with a screenshot of your error message.

## Configuration:
* Copy config-boilerplate.js as config.js and substitute (1) your valid login for Jira server or Jira cloud, as well as (2) your valid GitHub login. Recommended: instead of a username and password, create a GitHub ["personal access token"](https://github.com/settings/tokens). GitHub can then automatically revoke a token that is accidentally commited into a public repository; GitHub does not do this with passwords.
* Copy j2g-username-map-boilerplate.json as j2g-username-map.json, and list the users in your organization, mapping jira-username keys to github-username values.
* In the `fetchXML` function in `panta.js`, edit the `url` variable to reflect your Jira instance's XML `HTTPS GET` link.

## Usage:
notation: <required_arg> [optional_arg]

Port a specified Jira issue into `https://github.com/<GITHUB_USERNAME_OR_ORGANIZATION>/<REPO>`
  
`node panta j2g <GITHUB_USERNAME_OR_ORGANIZATION> <REPO> <JIRA_ISSUE_CODE> [MORE_JIRA_ISSUE_CODES...]`

Example: `node panta j2g zowe zlux MVD-3048 MVD-3060`

Note: 'MVD' is an example of a project prefix.

Note: <GITHUB_USERNAME_OR_ORGANIZATION> <REPO> indicate the owner and repo where your jira issues will POST; this username is not to be confused with your authentication username.

## Testing:

In test/panta-test.js, make sure the testURL is correct for your Jira instance.

## Namesake:
A buggy Greek translation.
