'use strict';

//const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const dynamodb = new AWS.DynamoDB({"region": process.env.REGION, apiVersion: "2012-08-10"});

module.exports.getStoriesById = (event, context, callback) => {
  const storyIdentifier = event && event.pathParameters && event.pathParameters.storyIdentifier ? event.pathParameters.storyIdentifier : "";
  const params = {
    TableName: process.env.STORIES_DYNAMODB_TABLE,
    Key : {
      storyIdentifier : {
        S : storyIdentifier
      }
    },
    ReturnConsumedCapacity: "TOTAL"
  };

  dynamodb.getItem(params, function(error, data) {
    if (error) {
      callback(error);
      return;
    }
    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
      },
      body: JSON.stringify(story(data))
    };
    callback(null, response);
  });
};

function story(data) {
  if (!data || !data.Item) {
    return {};
  }
  const item = data.Item;
  const story = {
   "storyId": item.storyIdentifier.S,
   "revisionId": item.revisionIdentifier.S,
   "type": item.storyType.S,
   "creationDate": item.creationDate.S,
   "modificationDate": item.modificationDate.S,
   "publicationDate": item.publicationDate.S,
   "title": item.title.S,
   "callout": JSON.parse(item.callout.S),
   "share": JSON.parse(item.storyShare.S),
   "cards": JSON.parse(item.cards.S),
   "bodyHtml": item.bodyHtml.S
  };
  return story;
}
