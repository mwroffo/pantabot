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
    },
    START_DATE: '2019-07-23T10:00:00Z',
    END_DATE: '2019-07-23T22:00:00Z'
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

describe('isOpen(orgOrUser, repo, issueID): boolean', () => {
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

describe('openedByDate(orgOrUser, repo, issueID, startDate, cmd): boolean', () => {
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

describe.only('changedToClosed(orgOrUser, repo, issueID, startDate, endDate, cmd): boolean', () => {
    const localDebug = true;
    it('should be a function', () => {
        expect(Panta.changedToClosed).to.be.a('function');
    });
    it('should return true if an issue was (1) not closed before startDate, then (2) became closed before endDate', async () => {
        const issueOpenThenClosed = 57;
        const issueDNEThenClosed = 59;
        expect(await Panta.changedToClosed(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueOpenThenClosed, TEST_CONF.START_DATE, TEST_CONF.END_DATE, {debug: localDebug, uiIsOn: false} )).to.be.true;
        expect(await Panta.changedToClosed(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueDNEThenClosed, TEST_CONF.START_DATE, TEST_CONF.END_DATE, {debug: localDebug, uiIsOn: false} )).to.be.true;
    });
    it('should return false if an issue was open before startDate and remained open upon endDate', async () => {
        const issueOpenThenOpen = 56;
        expect(await Panta.changedToClosed(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueOpenThenOpen, TEST_CONF.START_DATE, TEST_CONF.END_DATE, {debug: localDebug, uiIsOn: false} )).to.be.false;
    });
    it('should return false if an issue was closed before startDate, and remained closed upon endDate', async () => {
        const issueClosedThenClosed = 50;
        expect(await Panta.changedToClosed(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueClosedThenClosed, TEST_CONF.START_DATE, TEST_CONF.END_DATE, {debug: localDebug, uiIsOn: false} )).to.be.false;
    });
    it('should return false if an issue was closed before startDate, and was reopened between startDate and endDate', async () => {
        const issueClosedThenReopened = 54;
        expect(await Panta.changedToClosed(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueClosedThenReopened, TEST_CONF.START_DATE, TEST_CONF.END_DATE, {debug: localDebug, uiIsOn: false} )).to.be.false;
    });
});

describe.only('getTargetIssues(orgOrUser, repo, issueIDs, startDate, endDate, cmd): array of issueIDs', () => {
    const localDebug = true;
    it('should be a function', () => {
        expect(Panta.changedToClosed).to.be.a('function');
    });
    it('for a single owner/repo, should return a subarray of issueIDs that pass changedToChanged for the given date range', async () => {
        expect(await Panta.getTargetIssues(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, TEST_CONF.START_DATE, TEST_CONF.END_DATE, {debug: localDebug, uiIsOn: false} )).to.be.an('array').that.includes(57,58,59).and.not.include(50,54,56);
    }).timeout(7000);
});

describe('createNewMilestoneInRepo(orgOrUser, repo, newMilestoneTitle, cmd): number || boolean', () => {
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

describe('getMilestoneIDByTitle(orgOrUser, repo, milestoneTitle, cmd): number || boolean', () => {
    xit('should be a function', () => {
        expect(Panta.getMilestoneIDByTitle).to.be.a('function');
    });
    xit('given a valid (i.e. exists) milestoneTitle as string, should return the ID of the milestone in orgOrUser/repo with that title', async () => {
        const milestoneTitleThatExists = '0.1.0';
        expect(await Panta.getMilestoneIDByTitle( TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, milestoneTitleThatExists, {debug: false, uiIsOn: false} )).to.equal(1);
    });
    it('given an invalid (i.e. DNE) milestoneTitle as string, should return false', async () => {
        const milestoneTitleThatDNE = 'nop';
        expect(await Panta.getMilestoneIDByTitle( TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, milestoneTitleThatDNE, {debug: false, uiIsOn: false} )).to.be.false;
    });
    xit('does not need to deal with duplicate titles since github repos do not allow two milestones with identical titles', () => {});
});

describe('updateMilestoneOfIssue(orgOrUser, repo, issueID, newMilestoneTitle, cmd): number || boolean', () => {
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

describe('multiUpdateMilestoneOfIssue(orgOrUser, repo, issueIDs, newMilestoneTitle, cmd): number || boolean', () => {
    it('should be a function', () => {
        expect(Panta.multiUpdateMilestoneOfIssue).to.be.a('function');
    });
    it('given existing issues under same repo, should add milestone that DOES exist and assign it without creating a duplicate milestone', async () => {
        const issueIDsThatExist = [ 56, 57, 58 ];
        const milestoneTitleThatDNE = '0.1.0';
        let issueIDsUpdated = await Panta.multiUpdateMilestoneOfIssue(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueIDsThatExist, milestoneTitleThatDNE, {debug: true, uiIsOn: false} );
        expect(issueIDsUpdated).to.be.an('array').which.deep.equals([ 56, 57, 58 ]);
    })
    it('given existing issues under same repo, should add milestone that DNE and assign it without residual dups', async () => {
        const issueIDsThatExist = [ 56, 57, 58 ];
        const milestoneTitleThatDNE = '0.2.0';
        let issueIDsUpdated = await Panta.multiUpdateMilestoneOfIssue(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueIDsThatExist, milestoneTitleThatDNE, {debug: true, uiIsOn: false} );
        expect(issueIDsUpdated).to.be.an('array').which.deep.equals([ 56, 57, 58 ]);
    });
    it('given one or more issues that do not exist, should return false', async () => {
        const issueIDs = [ 1000, 1001, 1002 ];
        const milestoneTitleThatDNE = 'schrodinger\'s milestone';
        expect(await Panta.multiUpdateMilestoneOfIssue(TEST_CONF.ORG_OR_USER, TEST_CONF.REPO, issueIDs, milestoneTitleThatDNE, {debug: true, uiIsOn: false} )).to.be.false;
    });
});

describe('multiReposUpdateMilestoneOfIssues(options, newMilestoneTitle, cmd)', () => {
    it('should be a function', () => {
        expect(Panta.multiReposUpdateMilestoneOfIssues).to.be.a('function');
    });
    it('given an options object with keys \"owner repo\" and values [issueID1, issueID2, etc...], should run multiUpdateMilestoneOfIssue for each key-value pair. on success, return the options, on failure, return false.', async () => {
        const options = {
            "mwroffo testrepo": [56, 57, 58],
            "mwroffo testrepo2": [1],
            "mwroffo testrepo3": [1,2]
        }
        const newMilestoneTitle = "multiReposUpdateTestMilestone";
        const result = await Panta.multiReposUpdateMilestoneOfIssues(options, newMilestoneTitle, {debug: true, uiIsOn: false});
        expect(result).to.deep.equal(options);
    }).timeout(8000);
});

describe('multiReposUpdateMilestoneOfIssues(options, newMilestoneTitle, cmd)', () => {
    it('should be a function', () => {
        expect(Panta.multiReposUpdateMilestoneOfIssues).to.be.a('function');
    });
    it('given an options object with keys \"owner repo\" and values [issueID1, issueID2, etc...], should run multiUpdateMilestoneOfIssue for each key-value pair. on success, return the options, on failure, return false.', async () => {
        const options = {
            "mwroffo testrepo": [56, 57, 58],
            "mwroffo testrepo2": [1],
            "mwroffo testrepo3": [1,2]
        }
        const newMilestoneTitle = "multiReposUpdateTestMilestone";
        const result = await Panta.multiReposUpdateMilestoneOfIssues(options, newMilestoneTitle, {debug: true, uiIsOn: false});
        expect(result).to.deep.equal(options);
    });
});