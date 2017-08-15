Package.describe({
  name: 'apinf:fiware',
  version: '0.0.1',
  summary: 'OAuth handler for Fiware',
  git: 'https://github.com/apinf/apinf-idm',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use('accounts-ui', ['client', 'server']);
  api.use('oauth2', ['client', 'server']);
  api.use('oauth', ['client', 'server']);
  api.use('http', ['server']);
  api.use(['underscore', 'service-configuration'], ['client', 'server']);
  api.use(['random', 'templating'], 'client');

  api.export('Fiware');

  api.addFiles(
    ['fiware_configure.html', 'fiware_configure.js'],
    'client');

  api.addFiles('fiware_server.js', 'server');
  api.addFiles('fiware_client.js', 'client');
});
