# Supporting Clever Instant Login

Clever integrates with many application types through [Instant Login](https://dev.clever.com/instant-login). Instant Login is powered by the OAuth2 standard, so it's easy to get started quickly in our technology of choice. Let's take a look at an example NodeJS web application using the PassportJS framework.

## Dependencies

### App Creation

An application must be created in Clever's developer portal. Signing up for a developer account creates this application. It can be found later by browsing to Applications in the Settings section of left-hand menu of the developer portal. A demo district is also generated for testing purposes. 

Here are a few resources that should not be missed:

  1. [Getting Started](https://dev.clever.com/clever/)
  1. [Obtaining Bearer Tokens](https://dev.clever.com/instant-login/bearer-tokens)
  1. [Testing Your Integration](https://dev.clever.com/instant-login/testing)


### App Configuration

We've stored configuration for our app in a separate file. The values to complete this configuration are found in your application and district within the developer portal. We've separated our client id from the instant login url below. The PassportJS framework will handle this addition at runtime, and this relieves us from repeating the client id in our configuration. We have used the /instant-login endpoint for the login url, but this application would function the same if the /authorize endpoint were substituted.

```javascript
var appConfig = {
  'port' : 3000,
  'sessionSecret' : '{SessionSecret}',
  'requestUrl' : 'https://api.clever.com',
  'oauth' : {
    // credentials
    'clientId' : '{ClientId}',
    'clientSecret' : '{ClientSecret}',
    // instant clever login urls
    'instantLoginUrl' : 'https://clever.com/oauth/instant-login?district_id={DistrictId}',
    'instantCallbackUrl' : 'https://{DomainName}/auth/clever-instant/callback',
    // token url
    'tokenUrl' : 'https://clever.com/oauth/tokens?grant_type=authorization_code' 
  }
};
module.exports = appConfig;
```
Note: Placeholder values are surrounded in braces.

### Node.js Modules

We'll use a few Node.js dependencies and our config from above. We did run into one small issue where OAuth2Strategy did not match Clever's requirement of passing the client credentials to the token endpoint. The built-in strategy passed these values in the query string, but Clever requires them in a basic authentication header. It was really just a couple of lines that needed to change, but they were deep in the framework. We will gloss over this detail below for simplicity, but you can compare bak files in the clever-passport-oauth folder for clarity.

```javascript
var express = require('express');
var passport = require('passport');
//var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var OAuth2Strategy = require('./clever-passport-oauth/index').OAuth2Strategy;
var request = require('request');
var appConfig = require('./appConfig');
```
Note: Passport's OAuth2 strategy was customized to support Clever's token URL.

#### App Setup

There is some necessary setup to get the NodeJS frameworks configured. It has little to do with our application's purpose, but we'll show it here anyway.

```javascript
var app = express();
app.set('port', (process.env.PORT || appConfig.port));

app.use(express.static(__dirname + '/public'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: appConfig.sessionSecret, resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
```

## Passport for OAuth

### Passport Configuration

This PassportJS framework will handle the OAuth details for us. We must give it some configuration and direction on parsing and persisting the returned data.

```javascript
// setup instant login through passport
passport.use('clever-instant', new OAuth2Strategy({
    authorizationURL: appConfig.oauth.instantLoginUrl,
    tokenURL: appConfig.oauth.tokenUrl,
    clientID: appConfig.oauth.clientId,
    clientSecret: appConfig.oauth.clientSecret,
    callbackURL: appConfig.oauth.instantCallbackUrl
  },
  function(accessToken, refreshToken, profile, done) {
    var fakeUser = { 'accessToken' : accessToken };
    var options =  { 'method' : 'GET',
                     'uri' : '/me'
                   };
    var callback = function(user, data) {
      var fullUser = null;
      if(data  && data.data) {
        fullUser = data.data;
        fullUser.accessToken = user.accessToken;
      }
      done(null, fullUser);
    };
    handleRequest(fakeUser,options,callback);
  }
));
```

### Passport Persistence

A naive persistence layer is used for this demo. You'll want something more durable. The PassportJS framework just needs to store a user's tokens between request.

```javascript
var users = [];

// retrieve user for request
function findUser(request) { 
  return users[request.session.passport.user]; 
};

// store user in persistent storage for passport
passport.serializeUser(function(user, done) {
  users[user.id] = user;
  done(null, user.id);
});

// retrieve user from persistent store for passport 
passport.deserializeUser(function(id, done) {
  var user = users[id];
  done(null, user);
});

// require token for session enabled request
function requireToken() {
  return function(req, res, next) {
     if (req.session.passport &&
         req.session.passport.user &&
         findUser(req)) {
       next();
     }
     else {
       res.redirect('/login');
     }
   }
}
```

## Application Logic

### Common Utilities

We'll need to make API calls, and this function will make that a little easier.

```javascript
// simplified request handling
function handleRequest(user, options, callback) {
  var headers =  { 'Authorization': 'Bearer ' + user.accessToken, 
                   'Content-Type': 'application/json',
                   'User-Agent': 'My App'
                 };
  request({ 
        'uri' : appConfig.requestUrl + options.uri,
        'method' : 'GET',
        'headers' : headers 
  }, 
  function(error, response, body) {
    if(error) {
      callback(user,null);
      return;
    }
    if (response.statusCode === 200) {
      callback(user,JSON.parse(body));
    } else {
      callback(user,response.statusCode);
    }
  });
};
```

### App URLs

We need to expose URLs that route our applications' traffic to Passport's functionality.

```javascript
// entry point for clever instant auth
app.get('/auth/clever-instant', passport.authenticate('clever-instant'));

// callback for clever auth
app.get('/auth/clever-instant/callback', 
  passport.authenticate('clever-instant', { successRedirect: '/',
                                            failureRedirect: '/login'
                                          }));

// login setup
app.get('/login', function(req, res){
  res.send('<a href="/auth/clever/instant"><img src="images/sign-in-with-clever-full.png" /></a>');
});

// list the user's profile if authenticated
app.get('/',requireToken(), function(request, response) {
    var options =  { 'method' : 'GET', 
                     'uri' : '/me'
                   };
    var callback = function(user, data) {
      response.send('<pre>' + JSON.stringify(data,null,'  ') + '</pre>');
    };
    handleRequest(findUser(request),options,callback);  
});
```

### App Launch

Finally, we just start the server.

```javascript
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
```

## Application Experience

Expect the following when testing the application: 
  
  1. The "Login with Clever" button will greet you.
  1. This button will launch Clever's demo login screen.
  1. Successful login will diplay the user's profile in raw JSON.

Enjoy!
