'use strict';

//const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const dynamodb = new AWS.DynamoDB.DocumentClient({ 'region': process.env.REGION, "apiVersion": "2012-08-10" });
// loos like API GW can not validate input properties based on pattern
const storyIdentifierPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const feedIdentifierPattern = storyIdentifierPattern;

module.exports.handler = (event, context, callback) => {
  const feedIdentifier = event.pathParameters.feedIdentifier;
  // haven't found so far a way to reuse JS RegEx
  const pattern = new RegExp(feedIdentifierPattern.source, feedIdentifierPattern.flags);
  if (!pattern.test(feedIdentifier)) {
    console.error('Invalid feed identifier:', feedIdentifier);
    callback('Invalid feed identifier format.');
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
  const feedIdentifier = event.pathParameters.feedIdentifier;
  query(feedIdentifier, function (error, result) {
    if (error) {
      console.error(error);
      callback(error);
      return;
    }
    if (0 == result.length) {
      const response = {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*" // Required for CORS support to work
        }
      };
      callback(null, response);
      return;
    }
    const storyIdentifiers = result.map(function (item) {
      return item.storyIdentifier;
    });
    dynamodb.batchGet(batchGetItemsRequest(storyIdentifiers), function (error, data) {
      if (error) {
        console.error(error);
        callback(error);
        return;
      }
      let responses = data.Responses;
      let items = data.Responses[process.env.STORIES_DYNAMODB_TABLE];
      if (0 == items.lenght) {
        const response = {
          statusCode: 204,
          headers: {
            "Access-Control-Allow-Origin": "*" // Required for CORS support to work
          }
        };
        callback(null, response);
        return;
      }
      const stories = [];
      for (let item of items) {
        stories.push(story(item));
      }
      stories.sort(function (a, b) {
        return storyIdentifiers.indexOf(a.storyId) - storyIdentifiers.indexOf(b.storyId);
      });

      const body = {
        stories: stories
      }
      const response = {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*" // Required for CORS support to work
        },
        body: JSON.stringify(body)
      };
      callback(null, response);
    });
  });
}

function put(event, context, callback) {
  const feedIdentifier = event.pathParameters.feedIdentifier;
  const storyIdentifiers = JSON.parse(event.body).stories;
  // for (let storyIdentifier of storyIdentifiers) {
  //   const isValid = storyIdentifierPattern.test(storyIdentifier);
  //   if (!isValid) {
  //     console.log('storyIdentifier:', storyIdentifier, typeof storyIdentifier, storyIdentifier.length, isValid);
  //     callback('Invalid story identifier format.');
  //     return;
  //   }  
  // }
  putStories(storyIdentifiers, feedIdentifier, function (error, data) {
    if (error) {
      console.error(error);
      callback(error);
      return;
    }
    get(event, context, callback);
  });
}

function query(feedIdentifier, callback) {
  const params = {
    TableName: process.env.FEEDS_DYNAMODB_TABLE,
    IndexName: process.env.FEED_IDENTIFIER_DYNAMODB_GSI,
    ProjectionExpression: "hashKey, storyIdentifier, storyPosition",
    KeyConditionExpression: 'feedIdentifier = :feedIdentifier',
    ExpressionAttributeValues: { ':feedIdentifier': feedIdentifier }
  };
  dynamodb.query(params, function (error, data) {
    if (error) {
      callback(error, null);
      return;
    }
    const result = data.Items.map(function (item) {
      return { hashKey: item.hashKey, storyIdentifier: item.storyIdentifier, storyPosition: item.storyPosition };
    });
    callback(null, result);
  });
}

function putStories(storyIdentifiers, feedIdentifier, callback) {
  query(feedIdentifier, function (error, items) {
    if (error) {
      callback(error, null);
      return;
    }
    const itemsToDelete = items.filter(function (item) {
      return !storyIdentifiers.includes(item.storyIdentifier);
    });
    const hashKeysToDelete = itemsToDelete.map(function (item) {
      return item.hashKey;
    });
    const requests = deleteRequests(hashKeysToDelete).concat(putRequests(feedIdentifier, storyIdentifiers));
    const params = {
      RequestItems: {
      }
    };
    params.RequestItems[process.env.FEEDS_DYNAMODB_TABLE] = requests;
    console.log("batchWriteItem:", params);
    dynamodb.batchWrite(params, function (error, data) {
      callback(error, data);
    });
  });
}

function deleteRequests(hashKeysToDelete) {
  var deleteRequests = [];
  for (var position = 0, length = hashKeysToDelete.length; position < length; position++) {
    const hashKey = hashKeysToDelete[position];
    deleteRequests[position] = {
      DeleteRequest: {
        Key: {
          hashKey: hashKey
        }
      }
    };
  }
  return deleteRequests;
}

function putRequests(feedIdentifier, storyIdentifiers) {
  var putItems = [];
  for (var position = 0, length = storyIdentifiers.length; position < length; position++) {
    const storyIdentifier = storyIdentifiers[position];
    const storyPosition = position;
    putItems[position] = {
      PutRequest: {
        Item: {
          hashKey: feedIdentifier + storyIdentifier,
          feedIdentifier: feedIdentifier,
          storyIdentifier: storyIdentifier,
          storyPosition: storyPosition
        }
      }
    };
  }
  return putItems;
}

function batchGetItemsRequest(storyIdentifiers) {
  const keys = [];
  for (let storyIdentifier of storyIdentifiers) {
    keys.push({
      storyIdentifier: storyIdentifier
    });
  }
  const request = {
    RequestItems: {
    }
  };
  request.RequestItems[process.env.STORIES_DYNAMODB_TABLE] = {
    Keys: keys,
    ProjectionExpression: "storyIdentifier, revisionIdentifier, storyType, creationDate, modificationDate, publicationDate, title, callout, storyShare, cards"
  };
  return request;
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
    callout: item.callout? JSON.parse(item.callout) : null,
    share: item.storyShare ? JSON.parse(item.storyShare) : null,
    cards: item.cards ? JSON.parse(item.cards) : null
  }
  return story;
}
