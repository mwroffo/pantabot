'use strict';

const fs = require('fs');
const expect = require('chai').expect;
const Panta = require('../panta.js');
const testIssueID = 'MVD-3048';
const testXML = fs.readFileSync(`${__dirname}/jira-issue.xml`, {encoding: "UTF-8"});
let TEST_CONF = {
    DEBUG: false,
    ORG_OR_USER: "mwroffo",
    REPO: "testrepo",
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

describe.only('isOpen(orgOrUser, repo, issueID): boolean', () => {
    it('should be a function', () => {
        expect(Panta.isOpen).to.be.a('function');
    });
    it('should correctly return whether an issue is open on some repo', async () => {
        const issueThatDoesNotExist = 1000;
        const issueThatExistsButIsClosed = 1;
        const issueThatExistsAndIsOpen = 56;
        expect(await Panta.isOpen(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueThatDoesNotExist, {debug: false, uiIsOn: false} )).to.be.false;
        expect(await Panta.isOpen(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueThatExistsButIsClosed, {debug: false, uiIsOn: false} )).to.be.false;
        expect(await Panta.isOpen(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueThatExistsAndIsOpen, {debug: false, uiIsOn: false} )).to.be.true;
    });
});

describe.only('openedByDate(orgOrUser, repo, issueID, startDate, cmd): boolean', () => {
    it('should be a function', () => {
        expect(Panta.openedByDate).to.be.a('function');
    });
    it('should correctly return whether an issue was opened on or after startDate', async () => {
        const issueThatDoesNotExist = 1000;
        const issueOpenedBeforeStartDate = 1;
        const issueOpenedAfterStartDate = 54;
        const testStartDate = '2019-07-19T15:09:36Z';
        expect(await Panta.openedByDate(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueThatDoesNotExist, testStartDate, {debug: false, uiIsOn: false} )).to.be.false;
        expect(await Panta.openedByDate(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueOpenedBeforeStartDate, testStartDate, {debug: false, uiIsOn: false} )).to.be.false;
        expect(await Panta.openedByDate(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueOpenedAfterStartDate, testStartDate, {debug: false, uiIsOn: false} )).to.be.true;
    });
});

describe.only('testing async function updateMilestoneOfIssue(orgOrUser, repo, issueID, newMilestoneTitle, cmd): number || boolean', () => {
    it('should be a function', () => {
        expect(Panta.updateMilestoneOfIssue).to.be.a('function');
    });
    it('should assign a milestone that already exists, returning the milestoneID upon success', async () => {
        const testIssueID = 56;
        const correspondingMilestoneIDThatAlreadyExists = 1;
        const milestoneTitleThatAlreadyExists = '0.1.0';
        expect(await Panta.updateMilestoneOfIssue(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, testIssueID, milestoneTitleThatAlreadyExists, {debug: false, uiIsOn: false} ))
            .to.be.a('number').which.equals(correspondingMilestoneIDThatAlreadyExists);
    }).timeout(5000);
    it('if an assigned milestone does not yet exist, should create the milestone before assigning it using Panta.createNewMilestoneInRepo, then returning the new milestoneID upon success', async () => {
        const testIssueID = 56;
        const milestoneTitleThatDNE = 'This is a milestone title that tests Panta.updateMilestoneOfIssue';
        const newMilestoneID = await Panta.updateMilestoneOfIssue(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, testIssueID, milestoneTitleThatDNE, {debug: false, uiIsOn: false} );
        expect(newMilestoneID).to.be.a('number');
        // cleanup:
        expect(await Panta.deleteMilestoneFromRepo(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, newMilestoneID, {debug: false, uiIsOn: false} )).to.be.a('number');
    }).timeout(5000);
    it('does not need to update a repo\'s milestone', () => {});
});

describe.only('testing async function createNewMilestoneInRepo(orgOrUser, repo, newMilestoneTitle, cmd): number || boolean', () => {
    it('should be a function', () => {
        expect(Panta.createNewMilestoneInRepo).to.be.a('function');
    });
    it('should throw if the response contains an error', async () => {
        const milestoneTitleThatAlreadyExists = '0.1.0';
        expect(await Panta.createNewMilestoneInRepo(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, milestoneTitleThatAlreadyExists, {debug: false, uiIsOn: false} )).to.be.false;
    });
    it('createNewMilestoneInRepo and deleteMilestoneFromRepo should each return milestoneID after success and throw on failure', async () => {
        const milestoneTitleThatDoesNotYetExist = '0.2.0';
        const milestoneID = await Panta.createNewMilestoneInRepo(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, milestoneTitleThatDoesNotYetExist, {debug: false, uiIsOn: false} );
        expect(milestoneID).to.be.a('number');
        // cleanup:
        expect(await Panta.deleteMilestoneFromRepo(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, milestoneID, {debug: false, uiIsOn: false} )).to.be.a('number');
        // now delete a milestone that DNE:
        expect(await Panta.deleteMilestoneFromRepo(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, 1000, {debug: false, uiIsOn: false} )).to.be.false;
    });
});

describe.only('testing async function getMilestoneIDByTitle(orgOrUser,repo, milestoneTitle, cmd): number || boolean', () => {
    it('should be a function', () => {
        expect(Panta.getMilestoneIDByTitle).to.be.a('function');
    });
    it('given a valid (i.e. exists) milestoneTitle as string, should return the ID of the milestone in orgOrUser/repo with that title', async () => {
        const milestoneTitleThatExists = '0.1.0';
        expect(await Panta.getMilestoneIDByTitle( TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, milestoneTitleThatExists, {debug: false, uiIsOn: false} )).to.be.a('number');
    });
    it('given an invalid (i.e. DNE) milestoneTitle as string, should return false', async () => {
        const milestoneTitleThatDNE = 'nop';
        expect(await Panta.getMilestoneIDByTitle( TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, milestoneTitleThatDNE, {debug: false, uiIsOn: false} )).to.be.false;
    });
    it('does not need to deal with duplicate titles since github repos do not allow two milestones with identical titles', () => {});
});