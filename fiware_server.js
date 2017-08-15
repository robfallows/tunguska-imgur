'use strict';

/**
 * Define the base object namespace. By convention we use the service name
 * in PascalCase (aka UpperCamelCase). Note that this is defined as a package global.
 */
Imgur = {};

/**
 * Boilerplate hook for use by underlying Meteor code
 */
Imgur.retrieveCredential = (credentialToken, credentialSecret) => {
  return OAuth.retrieveCredential(credentialToken, credentialSecret);
};

/**
 * Define the fields we want. Note that they come from various places...
 *  id, reputation, created: from https://api.imgur.com/3/account/{username}
 *  email: from https://api.imgur.com/3/account/{username}/settings
 * Note that we *must* have an id. Also, this array is referenced in the
 * accounts-imgur package, so we should probably keep this name and structure.
 */
Imgur.whitelistedFields = ['id', 'email', 'reputation', 'created'];

/**
 * Register this service with the underlying OAuth handler
 * (name, oauthVersion, urls, handleOauthRequest):
 *  name = 'imgur'
 *  oauthVersion = 2
 *  urls = null for OAuth 2
 *  handleOauthRequest = function(query) returns {serviceData, options} where options is optional
 * serviceData will end up in the user's services.imgur
 */
OAuth.registerService('imgur', 2, null, function(query) {

  /**
   * Make sure we have a config object for subsequent use (boilerplate)
   */
  const config = ServiceConfiguration.configurations.findOne({
    service: 'imgur'
  });
  if (!config) {
    throw new ServiceConfiguration.ConfigError();
  }

  /**
   * Get the token and username (Meteor handles the underlying authorization flow).
   * Note that the username comes from from this request in Imgur.
   */
  const response = getTokens(config, query);
  const accessToken = response.accessToken;
  const username = response.username;

  /**
   * If we got here, we can now request data from the account endpoints
   * to complete our serviceData request.
   * The identity object will contain the username plus *all* properties
   * retrieved from the account and settings methods.
  */
  const identity = _.extend(
    {username},
    getAccount(config, username, accessToken),
    getSettings(config, username, accessToken)
  );

  /**
   * Build our serviceData object. This needs to contain
   *  accessToken
   *  expiresAt, as a ms epochtime
   *  refreshToken, if there is one
   *  id - note that there *must* be an id property for Meteor to work with
   *  email
   *  reputation
   *  created
   * We'll put the username into the user's profile
   */
  const serviceData = {
    accessToken,
    expiresAt: (+new Date) + (1000 * response.expiresIn)
  };
  if (response.refreshToken) {
    serviceData.refreshToken = response.refreshToken;
  }
  _.extend(serviceData, _.pick(identity, Imgur.whitelistedFields));

  /**
   * Return the serviceData object along with an options object containing
   * the initial profile object with the username.
   */
  return {
    serviceData: serviceData,
    options: {
      profile: {
        name: response.username // comes from the token request
      }
    }
  };
});

/**
 * The following three utility functions are called in the above code to get
 *  the access_token, refresh_token and username (getTokens)
 *  account data (getAccount)
 *  settings data (getSettings)
 * repectively.
 */

/** getTokens exchanges a code for a token in line with Imgur's documentation
 *
 *  returns an object containing:
 *   accessToken        {String}
 *   expiresIn          {Integer}   Lifetime of token in seconds
 *   refreshToken       {String}    If this is the first authorization request
 *   account_username   {String}    User name of the current user
 *   token_type         {String}    Set to 'Bearer'
 *
 * @param   {Object} config       The OAuth configuration object
 * @param   {Object} query        The OAuth query object
 * @return  {Object}              The response from the token request (see above)
 */
const getTokens = function(config, query) {

  const endpoint = 'https://api.imgur.com/oauth2/token';

  /**
   * Attempt the exchange of code for token
   */
  let response;
  try {
    response = HTTP.post(
      endpoint, {
        params: {
          code: query.code,
          client_id: config.clientId,
          client_secret: OAuth.openSecret(config.secret),
          grant_type: 'authorization_code'
        }
      });

  } catch (err) {
    throw _.extend(new Error(`Failed to complete OAuth handshake with Imgur. ${err.message}`), {
      response: err.response
    });
  }

  if (response.data.error) {

    /**
     * The http response was a json object with an error attribute
     */
    throw new Error(`Failed to complete OAuth handshake with Imgur. ${response.data.error}`);

  } else {

    /** The exchange worked. We have an object containing
     *   access_token
     *   refresh_token
     *   expires_in
     *   token_type
     *   account_username
     *
     * Return an appropriately constructed object
     */
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      username: response.data.account_username
    };
  }
};

/**
 * getAccount gets the basic Imgur account data
 *
 *  returns an object containing:
 *   id             {Integer}         The user's Imgur id
 *   url            {String}          The account username as requested in the URI
 *   bio            {String}          A basic description the user has filled out
 *   reputation     {Float}           The reputation for the account.
 *   created        {Integer}         The epoch time of account creation
 *   pro_expiration {Integer/Boolean} False if not a pro user, their expiration date if they are.
 *
 * @param   {Object} config       The OAuth configuration object
 * @param   {String} username     The Imgur username
 * @param   {String} accessToken  The OAuth access token
 * @return  {Object}              The response from the account request (see above)
 */
const getAccount = function(config, username, accessToken) {

  const endpoint = `https://api.imgur.com/3/account/${username}`;
  let accountObject;

  /**
   * Note the strange .data.data - the HTTP.get returns the object in the response's data
   * property. Also, Imgur returns the data we want in a data property of the response data
   * Hence (response).data.data
   */
  try {
    accountObject = HTTP.get(
      endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).data.data;
    return accountObject;

  } catch (err) {
    throw _.extend(new Error(`Failed to fetch account data from Imgur. ${err.message}`), {
      response: err.response
    });
  }
};


/**
 * getSettings gets the basic Imgur account/settings data
 *
 *  returns an object containing:
 *   email                   {String}           The user's email address
 *   high_quality            {Boolean}          The user's ability to upload higher quality images, there will be less compression.
 *   public_images           {Boolean}          Automatically allow all images to be publicly accessible.
 *   album_privacy           {String}           Set the album privacy to this privacy setting on creation.
 *   pro_expiration          {Integer/Boolean}  False if not a pro user, their expiration date if they are.
 *   accepted_gallery_terms  {Boolean}          True if the user has accepted the terms of uploading to the Imgur gallery.
 *   active_emails           {Array of String}  The email addresses that have been activated to allow uploading.
 *   messaging_enabled       {Boolean}          If the user is accepting incoming messages or not.
 *   blocked_users           {Array of Object}  An array of users that have been blocked from messaging, the object is blocked_id and blocked_url.
 *   show_mature             {Boolean}          True if the user has opted to have mature images displayed in gallery list endpoints.
 *
 * @param   {Object} config       The OAuth configuration object
 * @param   {String} username     The Imgur username
 * @param   {String} accessToken  The OAuth access token
 * @return  {Object}              The response from the account request (see above)
 */
const getSettings = function(config, username, accessToken) {

  const endpoint = `https://api.imgur.com/3/account/${username}/settings`;
  let settingsObject;

  /**
   * Note the strange .data.data - the HTTP.get returns the object in the response's data
   * property. Also, Imgur returns the data we want in a data property of the response data
   * Hence (response).data.data
   */
  try {
    settingsObject = HTTP.get(
      endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).data.data;
    return settingsObject;

  } catch (err) {
    throw _.extend(new Error(`Failed to fetch settings data from Imgur. ${err.message}`), {
      response: err.response
    });
  }
};
