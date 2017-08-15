# apinf:idm

An ES2015 Meteor OAuth handler package for FIWARE IDM.

This is a fully working OAuth handler, allowing you to use FIWARE IDM as your Meteor authentication method. If you want to use it "as is" you can just `meteor add apinf:idm` to your application.

However, the package has been written to aid in understanding the mechanics of putting together an OAuth handler for any arbitrary provider. The trickier parts of the codebase are (hopefully) annotated well enough to comprehend what's going on in this bit of Meteor Magic, enabling you make a minimum number of changes for your chosen provider.

There's an [accompanying blog article](http://robfallows.github.io/2015/12/17/writing-an-oauth-2-handler.html) which should be read prior to forking and hacking!

See also the [complementary login package](https://github.com/apinf/apinf-accounts-idm): `apinf:accounts-idm`.

Enjoy :smile:
