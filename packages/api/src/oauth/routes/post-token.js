const Joi = require('joi');
const Boom = require('boom');
const { oauth: { scopes: validScopes } } = require('@lvconnect/config');

const grantTypes = [
  'password',
  'refresh_token',
  'authorization_code',
  'client_credentials',
];

function generateTokens(req, user, application, scope) {
  const { generateAccessToken, generateRefreshToken } = req.server.methods;
  const { accessTokenTTL } = req.server.plugins.oauth;

  return Promise.all([
    generateAccessToken(user, application, scope),
    user ? generateRefreshToken(user, application, scope) : undefined,
  ]).then(([accessToken, refreshToken]) => ({
    access_token: accessToken.token,
    token_type: 'bearer',
    expires_in: accessTokenTTL,
    refresh_token: refreshToken && refreshToken.token,
    scope,
    need_password_change: user ? user.needPasswordChange : undefined,
  }));
}

function checkScope(target, scopes) {
  return !target.some(scope => !scopes.includes(scope));
}

function handlePassword(req, application) {
  const { User } = req.server.plugins.users.models;

  const scopes = req.payload.scope || application.allowedScopes;
  if (!checkScope(scopes, application.allowedScopes)) {
    return Promise.reject(Boom.unauthorized('invalid_scope'));
  }

  return User.findOneByEmailAndPassword(req.payload.username, req.payload.password)
    .catch(() => Promise.reject(Boom.unauthorized('invalid_grant')))
    .then((user) => {
      if (user.leftAt < new Date()) {
        throw Boom.unauthorized('invalid_grant');
      }
      return generateTokens(req, user, application, scopes);
    });
}

function handleRefreshToken(req, application) {
  const { RefreshToken } = req.server.plugins.oauth.models;

  return RefreshToken.findOne({
    token: req.payload.refresh_token,
    expireAt: { $gt: Date.now() },
    application,
  }).populate('user').then((refreshToken) => {
    if (refreshToken === null || refreshToken.expireAt < new Date() || refreshToken.user.leftAt < new Date()) {
      return Boom.unauthorized('invalid_grant');
    }

    const scopes = req.payload.scope || application.allowedScopes;
    if (!checkScope(scopes, application.allowedScopes)) {
      return Promise.reject(Boom.unauthorized('invalid_scope'));
    }

    return generateTokens(req, refreshToken.user, application, scopes);
  });
}

function handleAuthorizationCode(req, application) {
  const { AuthorizationCode } = req.server.plugins.oauth.models;

  return AuthorizationCode.findOne({
    code: req.payload.code,
    application,
    expireAt: { $gt: Date.now() },
  }).populate('user').then((authorizationCode) => {
    if (authorizationCode === null || authorizationCode.user.leftAt < new Date()) {
      return Boom.unauthorized('invalid_grant');
    }

    const scopes = req.payload.scope || application.allowedScopes;
    if (!checkScope(scopes, application.allowedScopes)) {
      return Promise.reject(Boom.unauthorized('invalid_scope'));
    }

    return generateTokens(req, authorizationCode.user, application, scopes);
  });
}

function handleClientCredentials(req, application) {
  const scopes = (req.payload.scope || validScopes).filter(scope => /users:get/.test(scope));
  if (!checkScope(scopes, application.allowedScopes)) {
    return Promise.reject(Boom.unauthorized('invalid_scope'));
  }

  return generateTokens(req, null, application, scopes);
}

module.exports = {
  method: 'POST',
  path: '/oauth/token',
  config: {
    auth: 'application',
    validate: {
      payload: Joi.object({
        grant_type: Joi.string().valid(grantTypes).required(),
        username: Joi.any().when('grant_type', {
          is: 'password',
          then: Joi.string().required(),
          else: Joi.any().forbidden(),
        }),
        password: Joi.any().when('grant_type', {
          is: 'password',
          then: Joi.string().required(),
          else: Joi.any().forbidden(),
        }),
        refresh_token: Joi.alternatives().when('grant_type', { is: 'refresh_token', then: Joi.string().required() }),
        code: Joi.alternatives().when('grant_type', { is: 'authorization_code', then: Joi.string().required() }),
        redirect_uri: Joi.alternatives().when('grant_type', {
          is: 'authorization_code',
          then: Joi.string().required(),
        }),
        scope: Joi.array().items(Joi.string().valid(validScopes))
          .when('grant_type', { is: 'refresh_token', then: Joi.optional() })
          .when('grant_type', { is: 'password', then: Joi.optional() }),
      }),
    },
  },
  handler(req, rep) {
    const app = req.auth.credentials;

    switch (req.payload.grant_type) {
      case 'password':
        return rep(handlePassword(req, app)).code(201);
      case 'refresh_token':
        return rep(handleRefreshToken(req, app)).code(201);
      case 'authorization_code':
        return rep(handleAuthorizationCode(req, app)).code(201);
      case 'client_credentials':
        return rep(handleClientCredentials(req, app)).code(201);
      default:
        return rep(Boom.badRequest('unsupported_grant_type'));
    }
  },
};
