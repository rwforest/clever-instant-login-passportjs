var appConfig = {
  'port' : 3000,
  'sessionSecret' : 'abcdefg',
  'requestUrl' : 'https://api.clever.com',
  'oauth' : {
    // credentials
    'clientId' : '8b4601209eabeef73670',
    'clientSecret' : '7b3575240bcee395fbe4b4f11ff0b9ddbfd29f9e',
    // instant clever login urls
    'instantLoginUrl' : 'https://clever.com/oauth/instant-login?district_id=5940d0b58ec81e0001541ef3',
    'instantCallbackUrl' : 'http://localhost:3000/oauth/clever/callback',
    // token url
    'tokenUrl' : 'https://clever.com/oauth/tokens?grant_type=authorization_code' 
  }
};

module.exports = appConfig;
