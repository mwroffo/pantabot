# Panta.js
Given login credentials for (1) Jira and (2) Github, a USER_OR_ORGANIZATION, a REPO, and a list of valid Jira issue IDs, panta posts the issues (including titles, descriptions, and labels) to https://github.com/USER_OR_ORGANIZATION/REPO.

## Install:
* install [nodejs](https://nodejs.org/en/download/) _globally_ on your machine: 
* run `node --version` from your terminal to confirm that [NodeJS v7.10.1](https://node.green/#ES2017) or newer is installed .
* clone this repo: `git clone git@github.com:mwroffo/pantabot.git`
* run `npm i`
* should be good to go, but if not, please open an issue with a screenshot of your error message.

## Configuration:
1. Configure USERNAMES: Copy config-boilerplate.js as config.js. Replace the empty username fields with (1) your valid username for Jira server or Jira cloud, as well as (2) your valid GitHub username. Your new issues will show as posted by this username.
2. Configure PASSWORDS: Run the INSTALL-CONFIG wizard to securely pair a password with each of your usernames. _If a password changes, you must run this tool again._
3. In the `fetchXML` function in `panta.js`, edit the `url` variable to reflect your Jira instance's XML `HTTPS GET` link.
4. (Optional) If you want asignees to be ported: copy j2g-username-map-boilerplate.json as j2g-username-map.json, and list the users in your organization, mapping jira-username keys to github-username values.

## Usage:
notation: <required_arg> [optional_arg]

Port a specified Jira issue into `https://github.com/<GITHUB_USERNAME_OR_ORGANIZATION>/<REPO>`
  
`node panta j2g <GITHUB_USERNAME_OR_ORGANIZATION> <REPO> <JIRA_ISSUE_CODE> [MORE_JIRA_ISSUE_CODES...]`

Example: `node panta j2g zowe zlux MVD-3048 MVD-3060`

Note: 'MVD' is an example of a project prefix.

Note: <GITHUB_USERNAME_OR_ORGANIZATION> <REPO> indicate the owner and repo where your jira issues will POST; this username is not to be confused with your authentication username.

## Testing:

do `npm run build-for-cli` or test scripts will fail. In test/panta-test.js, make sure the testURL is correct for your Jira instance.

## Namesake:
A buggy Greek translation.
