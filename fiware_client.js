'use strict';

/**
 * Define the base object namespace. By convention we use the service name
 * in PascalCase (aka UpperCamelCase). Note that this is defined as a package global (boilerplate).
 */
Fiware = {};

/**
 * Request Fiware credentials for the user (boilerplate).
 * Called from accounts-fiware.
 *
 * @param {Object}    options                             Optional
 * @param {Function}  credentialRequestCompleteCallback   Callback function to call on completion. Takes one argument, credentialToken on success, or Error on error.
 */
Fiware.requestCredential = function(options, credentialRequestCompleteCallback) {
  /**
   * Support both (options, callback) and (callback).
   */
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  } else if (!options) {
    options = {};
  }

  /**
   * Make sure we have a config object for subsequent use (boilerplate)
   */
  const config = ServiceConfiguration.configurations.findOne({
    service: 'fiware'
  });
  if (!config) {
    credentialRequestCompleteCallback && credentialRequestCompleteCallback(
      new ServiceConfiguration.ConfigError()
    );
    return;
  }

  /**
   * Boilerplate
   */
  const credentialToken = Random.secret();
  const loginStyle = OAuth._loginStyle('fiware', config, options);

  /**
   * The response_type attribute is mandatory and must be set to code. The client_id attribute is the one provided by the
   * FIWARE IdM upon application registration. The redirect_uri attribute must match the Callback URL attribute provided 
   * to the IdM within the application registration. state is optional and for internal use of you application, if needed.
   * We use state to roundtrip a random token to help protect against CSRF (boilerplate)
   */
  // hard coded root url = https://account.lab.fiware.org
  const loginUrl = config.rootURL + '/oauth2/authorize' +
    '?response_type=code' +
    '&client_id=' + config.clientId +
    '&redirect_uri=' + config.redirectURI + 
    '&state=' + OAuth._stateParam(loginStyle, credentialToken);

  /**
   * Client initiates OAuth login request (boilerplate)
  */
  OAuth.launchLogin({
    loginService: 'fiware',
    loginStyle: loginStyle,
    loginUrl: loginUrl,
    credentialRequestCompleteCallback: credentialRequestCompleteCallback,
    credentialToken: credentialToken,
    popupOptions: {
      height: 600
    }
  });
};
