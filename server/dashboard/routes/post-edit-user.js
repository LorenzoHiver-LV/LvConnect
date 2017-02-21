const Joi = require('joi');
const { validRoles } = require('../../users/routes/user-validation');
const { hasRoleInList } = require('../middlewares');

module.exports = {
  method: 'POST',
  path: '/dashboard/users/{user}/edit',
  config: {
    pre: [hasRoleInList(['rh', 'staff'])],
    auth: 'session',
    validate: {
      payload: Joi.object({
        firstName: Joi.string().min(2).required(),
        lastName: Joi.string().min(2).required(),
        fallbackEmail: Joi.string().email().required(),
        description: Joi.string().empty('').max(255),
        roles: Joi.array().items(Joi.string().valid(validRoles)).single().min(1)
          .required(),
        githubHandle: Joi.string().allow(''),
        trelloHandle: Joi.string().allow(''),
      }),
      failAction: (req, res, src, error) => {
        res.view('edit-user', {
          pageTitle: 'Edit partner',
          userData: req.payload,
          validRoles,
          error,
        });
      },
    },
  },
  handler(req, res) {
    const { User } = req.server.plugins.users.models;
    const body = req.payload;
    const userId = req.params.user;
    const { githubOrgUserLink, trelloOrgUserLink } = req.server.plugins.tasks;

    User
      .findOneAndUpdate({ _id: userId }, { $set: body }, { new: true })
      .exec()
      .then((savedUser) => {
        if (savedUser.githubHandle && savedUser.thirdParty.github !== 'success') {
          githubOrgUserLink({ user: savedUser });
        }
        if (savedUser.trelloHandle && savedUser.thirdParty.trello !== 'success') {
          trelloOrgUserLink({ user: savedUser });
        }
        res.redirect(`/dashboard/users/${userId}`);
      })
      .catch(res);
  },
};