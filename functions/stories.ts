'use strict';

//const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const dynamodb = new AWS.DynamoDB.DocumentClient({ 'region': process.env.REGION, "apiVersion": "2012-08-10" });

module.exports.handler = (event, context, callback) => {
  switch (event.httpMethod) {
    case 'GET':
      get(event, context, callback);
      break;
    default:
      callback('Unknow HTTP method.');
  }
};

function get(event, context, callback) {
  scan(function (error, result) {
    if (error) {
      console.error(error);
      callback(error);
      return;
    }
    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*" // Required for CORS support to work
      },
      body: JSON.stringify({
        stories: result
      })
    };
    callback(null, response);
  });

}

function scan(callback) {
  const params = {
    TableName: process.env.STORIES_DYNAMODB_TABLE,
    ProjectionExpression: "storyIdentifier, revisionIdentifier, storyType, creationDate, modificationDate, publicationDate, title, callout, storyShare, cards"
  };
  dynamodb.scan(params, function (error, data) {
    if (error) {
      callback(error, null);
      return;
    }
    console.log('data:', data);
    const result = data.Items.map(function (item) {
      return story(item);
    });
    callback(null, result);
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
  }
  return story;
}