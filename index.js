var express = require('express');
var passport = require('passport');
//var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var OAuth2Strategy = require('./clever-passport-oauth/index').OAuth2Strategy;
var request = require('request');
var appConfig = require('./appConfig');

var app = express();
app.set('port', (process.env.PORT || appConfig.port));

///////////////////////////////////////////
// APP AND MODULE CONFIG 
///////////////////////////////////////////

app.use(express.static(__dirname + '/public'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: appConfig.sessionSecret, resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

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

///////////////////////////////////////////
// PERSISTENT SESSION SETUP 
// Note : Use a real store
///////////////////////////////////////////

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

///////////////////////////////////////////
//  COMMON FUNCTIONS
///////////////////////////////////////////

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

///////////////////////////////////////////
// SESSION HANDLING REQUEST HANDLERS 
///////////////////////////////////////////

// entry point for clever instant auth
app.get('/auth/clever-instant', passport.authenticate('clever-instant'));

// callback for clever auth
app.get('/oauth/clever/callback', 
  passport.authenticate('clever-instant', { successRedirect: 'http://localhost:8000/',
                                            failureRedirect: '/login'
                                          }));

// login setup
app.get('/login', function(req, res){
  res.send('<a href="/auth/clever-instant"><img src="images/sign-in-with-clever-full.png" /></a>');
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

///////////////////////////////////////////
// APP STARTUP
///////////////////////////////////////////

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
