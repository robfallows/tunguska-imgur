'use strict';

/**
 * Define the base object namespace. By convention we use the service name
 * in PascalCase (aka UpperCamelCase). Note that this is defined as a package global.
 */
Fiware = {};

/**
 * Boilerplate hook for use by underlying Meteor code
 */
Fiware.retrieveCredential = (credentialToken, credentialSecret) => {
  return OAuth.retrieveCredential(credentialToken, credentialSecret);
};

/**
 * Define the fields we want
 * Note that we *must* have an id. Also, this array is referenced in the
 * accounts-fiware package, so we should probably keep this name and structure.
 */
Fiware.whitelistedFields = ['id', 'email', 'displayName'];

/**
 * Register this service with the underlying OAuth handler
 * (name, oauthVersion, urls, handleOauthRequest):
 *  name = 'fiware'
 *  oauthVersion = 2
 *  urls = null for OAuth 2
 *  handleOauthRequest = function(query) returns {serviceData, options} where options is optional
 * serviceData will end up in the user's services.fiware
 */
OAuth.registerService('fiware', 2, null, function(query) {

  /**
   * Make sure we have a config object for subsequent use (boilerplate)
   */
  const config = ServiceConfiguration.configurations.findOne({
    service: 'fiware'
  });
  if (!config) {
    throw new ServiceConfiguration.ConfigError();
  }

  /**
   * Get the token (Meteor handles the underlying authorization flow).
   */
  const response = getTokens(config, query);
  const accessToken = response.accessToken;


  /**
   * If we got here, we can now request data from the account endpoints
   * to complete our serviceData request.
  */
  const identity = _.extend(
    getAccount(config, accessToken)
  );

  /**
   * Build our serviceData object. This needs to contain
   *  accessToken
   *  expiresAt, as a ms epochtime
   *  refreshToken, if there is one
   *  id - note that there *must* be an id property for Meteor to work with
   */
  const serviceData = {
    accessToken,
    expiresAt: (+new Date) + (1000 * response.expiresIn)
  };
  if (response.refreshToken) {
    serviceData.refreshToken = response.refreshToken;
  }
  _.extend(serviceData, _.pick(identity, Fiware.whitelistedFields));

  /**
   * Return the serviceData object along with an options object containing
   * the initial profile object with the username.
   */
  return {
    serviceData: serviceData,
    options: {
      profile: {
        //name: response.username // comes from the token request
      }
    }
  };
});

/**
 * The following three utility functions are called in the above code to get
 *  the access_token and refresh_token (getTokens)
 *  account data (getAccount)
 *  settings data (getSettings)
 * repectively.
 */

/**
 *  returns an object containing:
 *   accessToken        {String}
 *   expiresIn          {Integer}   Lifetime of token in seconds
 *   refreshToken       {String}    If this is the first authorization request
 *   token_type         {String}    Set to 'Bearer'
 *
 * @param   {Object} config       The OAuth configuration object
 * @param   {Object} query        The OAuth query object
 * @return  {Object}              The response from the token request (see above)
 */
const getTokens = function(config, query) {

  const endpoint = config.rootURL + '/oauth2/token';

  /**
   * Attempt the exchange of code for token
   */
  let response;
  try {
    response = HTTP.post(
      endpoint, {
        params: {
          code: query.code,
          redirectURI: config.redirectURI,
          //client_id: config.clientId,
          //client_secret: OAuth.openSecret(config.secret),
          grant_type: 'authorization_code'
        }
      });

  } catch (err) {
    throw _.extend(new Error(`Failed to complete OAuth handshake with Fiware. ${err.message}`), {
      response: err.response
    });
  }

  if (response.data.error) {

    /**
     * The http response was a json object with an error attribute
     */
    throw new Error(`Failed to complete OAuth handshake with Fiware. ${response.data.error}`);

  } else {

    /** The exchange worked. We have an object containing
     *   access_token
     *   refresh_token
     *   expires_in
     *   token_type
     *
     * Return an appropriately constructed object
     */
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type
    };
  }
};

/**
 * getAccount gets the basic fiware account data
 *
 * {
 *   id: 1,
 *   displayName: "Demo user",
 *   email: "demo@fiware.org",
 *   roles: [],
 *   organizations: []
 * }
 *
 * @param   {Object} config       The OAuth configuration object
 * @param   {String} accessToken  The OAuth access token
 * @return  {Object}              The response from the account request (see above)
 */
const getAccount = function(config, accessToken) {

  const endpoint = config.rootURL + "/user?access_token=" + accessToken;
  let accountObject;

  try {
    accountObject = HTTP.get(
      endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).data;
    return accountObject;

  } catch (err) {
    throw _.extend(new Error(`Failed to fetch account data from Fiware. ${err.message}`), {
      response: err.response
    });
  }
};