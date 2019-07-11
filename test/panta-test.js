'use strict';

const fs = require('fs');
const expect = require('chai').expect;
const Panta = require('../panta.js');
const testIssueID = 'MVD-3048';
const testXML = fs.readFileSync(`${__dirname}/jira-issue.xml`, {encoding: "UTF-8"});
let TEST_CONF = {
    DEBUG: false,
    ORG_OR_USER: "mwroffo",
    REPO: "asdf",
    TEST_ISSUE: {
        TITLE: 'Build a tool that automates issue-maintenance between GitHub and Jira',
        BODY: '<p>We want Zowe to be an open-source project; but keeping the open-source community updated on internal progress produces hours of tedium for project managers like <a href="https://jira.rocketsoftware.com/secure/ViewProfile.jspa?name=nrogers" class="user-hover" rel="nrogers">Nolan Rogers</a> and Scrum Masters like <a href="https://jira.rocketsoftware.com/secure/ViewProfile.jspa?name=rchowdhary" class="user-hover" rel="rchowdhary">Reet Chowdhary</a> who have to fill out GitHub issues manually. This tool (eventually a bot, perhaps) will automate the process of creating GitHub issues by fetching metadata for selected Jira issues, converting them into GitHub-friendly issues, and posting them to a corresponding repo under the Zowe organization on GitHub.</p>\r\n\r\n<p>MVP:<br/>\r\n [ ] port a selected jira issue to github with a simple command-line interface. Hopefully mapping the statuses in both Jira and github<br/>\r\n [ ] add a basic UI for usability</p>\r\n\r\n<p>Nice to have:<br/>\r\n [ ] fetch JSON directly from Jira rather than parsing XML (which requires only ordinary permissions). mroffo is waiting on RAC ticket for Jira API access</p>\r\n\r\n<p>Really nice to have:<br/>\r\n [ ] accomplish this in reverse: Issues created on a zowe github repo by open-source contributors automatically prompt <a href="https://jira.rocketsoftware.com/secure/ViewProfile.jspa?name=sgrady" class="user-hover" rel="sgrady">Sean Grady</a> for inclusion in Rocket\'s internal Jira. (likely will be a separate Issue)</p>',
        LABELS: ['Story', 'workspace', 'zowe', 'Workflows']
    }
};
let issueAsXML;
let issueAsJSON;

describe('fetchXML(issueID): xml_string', () => {
    it('should be a function', () => {
        expect(Panta.fetchXML).to.be.a('function');
    });

    it('should fetch a valid XML string from given testIssueID', async () => {
        issueAsXML = await Panta.fetchXML(testIssueID, { debug: TEST_CONF.DEBUG });
    
        expect(issueAsXML).to.be.a('string');
        
    });
});

describe('convertXMLIssue2GithubIssue(jiraIssueAsJSON): githubIssueAsJSON', () => {
    it('should be a function', () => {
        expect(Panta.convertXMLIssue2GithubIssue).to.be.a('function');
    });

    it('should parse XML issue into JSON issue', async () => {
        issueAsJSON = Panta.convertXMLIssue2GithubIssue(testXML, { debug: TEST_CONF.DEBUG });
    
        expect(issueAsJSON).to.be.an('object');
        expect(issueAsJSON).to.have.a.property('title', TEST_CONF.TEST_ISSUE.TITLE);
        expect(issueAsJSON).to.have.a.property('body', TEST_CONF.TEST_ISSUE.BODY);
        expect(issueAsJSON).to.have.a.property('labels')
          .that.is.an('array').with.lengthOf(4)
          .and.contains('workspace')
          .and.contains('zowe')
          .and.contains('Story')
          .and.contains('Workflows');
        expect(issueAsJSON).to.have.a.property('assignees')
            .that.is.an('array').with.lengthOf(1)
            .and.contains('mwroffo');
    });
});

describe('postIssue(githubIssueAsJSON): response', () => {
    it('should be a function', () => {
        expect(Panta.postIssue).to.be.a('function');
    });

    it('receive a 201 response from github noting title and description', async () => {
        const response = await Panta.postIssue(issueAsJSON, TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, { debug: TEST_CONF.DEBUG });
        expect(response).to.be.an('object');
        expect(response).to.have.a.property('data').to.have.a.property('title', TEST_CONF.TEST_ISSUE.TITLE);
        expect(response).to.have.a.property('data').to.have.a.property('body', TEST_CONF.TEST_ISSUE.BODY);
        // console.log(response);
    });
});