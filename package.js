Package.describe({
  name: 'tunguska:imgur',
  version: '0.0.1',
  summary: 'OAuth handler for Imgur',
  git: 'https://github.com/robfallows/tunguska-imgur',
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

  api.export('Imgur');

  api.addFiles(
    ['imgur_configure.html', 'imgur_configure.js'],
    'client');

  api.addFiles('imgur_server.js', 'server');
  api.addFiles('imgur_client.js', 'client');
});
