# Panta
If you use both Jira and GitHub to manage your project, use Panta to automate your most mundane tasks:
1. J2G: To invite collaboration on a Jira issue via GitHub, use Panta's J2G feature to port a jira issue into a specified GitHub repository, maintaining its title, description, labels, and assignee. Issues will post under the Github username entered in Settings.
2. Bulk-Update: When launching a new release, use Panta's Bulk-Update feature to update the milestone of many issues at once.
3. Settings: Use the settings tab to register your Jira and Github credentials and to specify target repositories for uses of Bulk-Update.

## Installation:
Just download and run the executable that corresponds to your operating system: TODO

## Configuration:
1. Mandatory: Open Panta and navigate to the 'Settings' tab. Enter your organization's valid base URI for your jira instance. Securely pair a password with each of your usernames for Jira/Github. If you change one or more of your passwords, be sure to do repeat this process, and don't forget to restart Panta for changes to take effect.
2. Optional: If you want asignees to be ported: copy j2g-username-map-boilerplate.json as j2g-username-map.json, and list the users in your organization, mapping jira-username keys to github-username values.

## Building from source:
* install [nodejs](https://nodejs.org/en/download/) _globally_ on your machine: 
* run `node --version` from your terminal to confirm that [NodeJS v7.10.1](https://node.green/#ES2017) or newer is installed .
* clone this repo: `git clone git@github.com:mwroffo/pantabot.git`
* run `npm install`
* run `npm run build-for-ui` or `npm run build-for-cli`
* run `npm start` to run the app, or `npm run deploy` to deploy it to an executable compatible with your system.

## CLI Usage:
The J2G feature is also supported by a CLI. If you want to build, extend, or simply use the CLI, do `node run build-for-cli`.

To port Jira issue(s) into `https://github.com/<owner>/<repo>`, run
  
`node panta j2g <owner> <repo> <jira_issue_id> [more_jira_issue_ids...]`

Example: `node panta j2g mwroffo pantabot MVD-3048 MVD-3060`.

Issues post under the username you register by using the UI's settings tab, or by directly editing config.js.

## Testing:

do `npm run build-for-cli` or test scripts will fail. In test/panta-test.js, make sure the testURL is correct for your Jira instance.

## Namesake:
Ancient Greek for 'for all time' or 'always', as in "With Panta, the latest issue-updates on your internal project are always available to your open source community."