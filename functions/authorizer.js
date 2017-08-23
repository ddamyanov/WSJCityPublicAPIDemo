'use strict';

const JWT = require('jsonwebtoken');
const JWKS = require('jwks-rsa');
const JWKSClient = JWKS({
  cache: true,
  //cacheMaxEntries: 5, // Default value
  //cacheMaxAge: ms('10h'), // Default value
  //strictSsl: true, // Default value
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs'
});
// https://github.com/awslabs/aws-apigateway-lambda-authorizer-blueprints/blob/master/blueprints/nodejs/index.js
exports.authorize = (event, context, callback) => {
  const token = token1(event);
  console.log("token:", token);
  if (token) {
    const decoded = JWT.decode(token, { complete: true });
    console.log("token:", token);
    const kid = decoded.header.kid;
    JWKSClient.getSigningKey(kid, (error, key) => {
      if (error) {
        console.log("error:", error);
        callback("Can not get signing key");
        returnl
      }
      const signingKey = key.publicKey || key.rsaPublicKey;
      JWT.verify(token, signingKey, function (error, decoded) {
        if (error) {
          console.log("error:", error);
          callback("Unauthorized");
          return;
        }
        const email = decoded.email;
        if (typeof email === 'string' && email.endsWith('@dowjones.com')) {
          callback(null, generatePolicy('user', 'Allow', event.methodArn));
          return;
        }
        callback(null, generatePolicy('user', 'Deny', event.methodArn));
      });
    });
    return;
  }
  callback("Unauthorized");
};

function token1(event) {
  const token = event.authorizationToken;
  return typeof token === 'string' && token.indexOf('Bearer') > -1 ? token.split(" ")[1] : token;
}

exports.allow = (event, context, callback) => {
  const policy = generatePolicy('user', 'Allow', event.methodArn);
  callback(null, policy);
};

var generatePolicy = function (principalId, effect, resource) {
  var authResponse = {};

  authResponse.principalId = principalId;
  if (effect && resource) {
    var policyDocument = {};
    policyDocument.Version = '2012-10-17'; // default version
    policyDocument.Statement = [];
    var statementOne = {};
    statementOne.Action = 'execute-api:Invoke'; // default action
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }

  // Can optionally return a context object of your choosing.
  authResponse.context = {};
  authResponse.context.stringKey = "stringval";
  authResponse.context.numberKey = 123;
  authResponse.context.booleanKey = true;
  return authResponse;
}