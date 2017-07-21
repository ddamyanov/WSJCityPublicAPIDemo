'use strict';

const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
//const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB({'region': process.env.REGION, "apiVersion": "2012-08-10"});

module.exports.putStory = (event, context, callback) => {
  const storyIdentifier = event && event.pathParameters && event.pathParameters.storyIdentifier ? event.pathParameters.storyIdentifier : "";
  const body = event && event.body ? JSON.parse(event.body) : {};
  const revisionIdentifier = body.revisionId;
  const storyType = body.type;
  const creationDate = body.creationDate;
  const modificationDate = body.modificationDate;
  const publicationDate = body.publicationDate;
  const title = body.title;
  const callout = JSON.stringify(body.callout);
  const storyShare = JSON.stringify(body.share);
  const cards = JSON.stringify(body.cards);
  const bodyHtml = body.bodyHtml;
  const params = {
   Item: {
    storyIdentifier: {
      S: storyIdentifier
    },
    revisionIdentifier: {
      S: revisionIdentifier
    },
    storyType: {
      S: storyType
    },
    creationDate: {
      S: creationDate
    },
    modificationDate: {
      S: modificationDate
    },
    publicationDate: {
      S: publicationDate
    },
    title: {
      S: title
    },
    callout: {
      S: callout
    },
    storyShare: {
      S: storyShare
    },
   cards: {
     S: cards
   },
    bodyHtml: {
      S: bodyHtml
    }
   },
   ReturnConsumedCapacity: "TOTAL",
   TableName: process.env.STORIES_DYNAMODB_TABLE
  };

  dynamodb.putItem(params, function(error, data) {

    if (error) {
      callback(error);
      return;
    }

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
      },
      body: JSON.stringify(data)
    };

    callback(null, response);
  });
};
