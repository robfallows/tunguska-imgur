Template.configureLoginServiceDialogForFiware.helpers({
  siteUrl: function () {
    return Meteor.absoluteUrl();
  }
});

Template.configureLoginServiceDialogForFiware.fields = function () {
  return [
    {property: "rootURL", label: "Root URL"},
    {property: "redirectURI", label: "Redirect URI"},
    {property: 'clientId', label: 'Client Id'},
    {property: 'secret', label: 'Client Secret'}
  ];
};
