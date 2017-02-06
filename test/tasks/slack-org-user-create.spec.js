const { expect } = require('chai');
const { noop } = require('lodash');

const [fixUser] = require('../fixtures/users');
const slackWorker = require('../../server/tasks/workers/slack-org-user-create');
const testSetup = require('../setup');

describe('Slack user onboarding', () => {
  let server;
  let User;

  before(async function () {
    server = await testSetup();
    User = server.plugins.users.models.User;
  });

  after(() => server.stop());

  it('should add user to Slack team', async function () {
    // When
    const user = await User.findOne({ email: fixUser.email });
    await slackWorker.initWorker(server)({ data: { user } }, noop);

    // Then
    const editedUser = await User.findOne({ email: fixUser.email });
    expect(editedUser.thirdParty.slack).to.equal('error'); // Error because we need paid plan to use SCIM API :(
  });
});
