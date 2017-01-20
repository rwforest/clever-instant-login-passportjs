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
