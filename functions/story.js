'use strict';

const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const dynamodb = new AWS.DynamoDB.DocumentClient({"region": process.env.REGION, apiVersion: "2012-08-10"});
// loos like API GW can not validate input properties based on pattern
const storyIdentifierPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

module.exports.handler = (event, context, callback) => {
  const storyIdentifier = event.pathParameters.storyIdentifier
  // haven't found so far a way to reuse JS RegEx
  const pattern = new RegExp(storyIdentifierPattern.source, storyIdentifierPattern.flags);
  if (!pattern.test(storyIdentifier)) {
    console.error('Invalid story identifier:', storyIdentifier);
    callback('Invalid story identifier format.');
    return;
  }
  switch (event.httpMethod) {
    case 'GET':
      get(event, context, callback);
      break;
    case 'PUT':
      put(event, context, callback);
      break;
    default:
      callback('Unknow HTTP method.');
  }
};

function get(event, context, callback) {
  const storyIdentifier = event.pathParameters.storyIdentifier;
  const params = {
    TableName: process.env.STORIES_DYNAMODB_TABLE,
    Key : {
      storyIdentifier : storyIdentifier
    },
    ReturnConsumedCapacity: "TOTAL"
  };

  dynamodb.get(params, function(error, data) {
    if (error) {
      console.error(error);
      callback(error);
      return;
    }
    // no such story
    if (!data.Item) {
      const response = {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
        }
      };
      callback(null, response);
      return;
    }
    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
      },
      // outputs {story:{}}
      body: JSON.stringify({story:story(data.Item)})
    };
    callback(null, response);
  });
}

function story(item) {
  const story = {
   storyId: item.storyIdentifier,
   revisionId: item.revisionIdentifier,
   type: item.storyType,
   creationDate: item.creationDate,
   modificationDate: item.modificationDate,
   publicationDate: item.publicationDate,
   title: item.title,
   callout: item.callout ? JSON.parse(item.callout) : null,
   share: item.storyShare ? JSON.parse(item.storyShare) : null,
   cards: item.cards ? JSON.parse(item.cards) : null,
   bodyHtml: item.bodyHtml
  };
  return story;
}

function put(event, context, callback) {
  const storyIdentifier = event.pathParameters.storyIdentifier;
  const body = event && event.body ? JSON.parse(event.body) : {};
  const revisionIdentifier = body.revisionId;
  const storyType = body.type;
  const creationDate = body.creationDate;
  const modificationDate = body.modificationDate;
  const publicationDate = body.publicationDate;
  const title = body.title;
  const callout = body.callout ? JSON.stringify(body.callout) : null;
  const storyShare = body.share ? JSON.stringify(body.share) : null;
  const cards = body.cards ? JSON.stringify(body.cards) : null;
  const bodyHtml = body.bodyHtml;
  const params = {
   Item: {
    storyIdentifier: storyIdentifier,
    revisionIdentifier: revisionIdentifier,
    storyType: storyType,
    creationDate: creationDate,
    modificationDate: modificationDate,
    publicationDate: publicationDate,
    title: title,
    callout: callout,
    storyShare: storyShare,
    cards: cards,
    bodyHtml: bodyHtml
   },
   ReturnConsumedCapacity: "TOTAL",
   TableName: process.env.STORIES_DYNAMODB_TABLE
  };

  dynamodb.put(params, function(error, data) {
    if (error) {
      console.error(error);
      callback(error);
      return;
    }
    get(event, context, callback);
  });
}