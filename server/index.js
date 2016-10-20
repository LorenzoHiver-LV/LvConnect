const Glue = require('glue');
const config = require('config');

const manifest = {
  server: {},
  registrations: [{
    plugin: {
      register: 'good',
      options: {
        reporters: {
          consoleReporter: [{
            module: 'good-console',
            args: [{ log: '*', response: '*' }],
          }, 'stdout'],
        },
      },
    },
  }, {
    plugin: 'hapi-auth-cookie',
  }, {
    plugin: 'hapi-auth-basic',
  }, {
    plugin: 'hapi-auth-bearer-token',
  }, {
    plugin: 'vision',
  }, {
    plugin: {
      register: './mongodb',
      options: config.mongodb,
    },
  }, {
    plugin: './users',
  }, {
    plugin: {
      register: './login',
      options: config.login,
    },
  }, {
    plugin: {
      register: './oauth',
      options: config.oauth,
    },
  }, {
    plugin: './dashboard',
  }, {
    plugin: {
      register: './kue',
      options: config.kue,
    },
  }, {
    plugin: './tasks',
  }],
  connections: [{
    host: 'localhost',
    port: 8000,
  }],
};

function createServer() {
  return Glue.compose(manifest, {
    relativeTo: __dirname,
  });
}

module.exports = createServer;

if (require.main === module) {
  createServer()
    .then(server => server.start().then(() => server))
    .then(server => server.log('info', `Server started on port ${server.connections[0].info.uri}`))
    .catch((err) => {
      console.error(err.stack);
      process.exit(1);
    });
}