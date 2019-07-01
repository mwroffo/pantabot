# pantabot
We want Zowe to be an open-source project; but keeping the open-source community updated on internal progress produces hours of tedium for project managers like Nolan Rogers and Scrum Masters like Reet Chowdhary who have to fill out GitHub issues manually. This tool (eventually a bot, perhaps) will automate the process of creating GitHub issues by fetching metadata for selected Jira issues, converting them into GitHub-friendly issues, and posting them to a corresponding repo under the Zowe organization on GitHub.

MVP:
[ ] port a selected jira issue to github with a simple command-line interface. Hopefully mapping the statuses in both Jira and github
[ ] add a basic UI for usability

Nice to have:
[ ] fetch JSON directly from Jira rather than parsing XML (which requires only ordinary permissions). mroffo is waiting on RAC ticket for Jira API access

Really nice to have:
[ ] accomplish this in reverse: Issues created on a zowe github repo by open-source contributors automatically prompt Sean Grady for inclusion in Rocket's internal Jira. (likely will be a separate Issue)

## usage:
Port a specified Jira issue into Github:
`node panta j2g <JIRA_ISSUE_CODE> <USERNAME_OR_ORGANIZATION> <REPO>`

## namesake:
Zoe == 'wisdom' in Greek, panta == 'for all', thus zowe panta == 'wisdom for all'. @ActualSpeakersOfGreek please forgive errors.