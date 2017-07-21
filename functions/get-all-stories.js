'use strict';

//const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const dynamodb = new AWS.DynamoDB({'region': process.env.REGION, "apiVersion": "2012-08-10"});


module.exports.getAllTopStories = (event, context, callback) => {
  query("TopStories", function(error, result) {
    if (error) {
      console.log(error);
      callback(error);
      return;
    }
    if (0 == result.length) {
      const response = {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
        }
      };
      callback(null, response);
      return;
    }
    console.log("result:", result);
    const storyIdentifiers = result.map(function (item) {
      return item.storyIdentifier;
    });
    dynamodb.batchGetItem(batchGetItemsRequest(storyIdentifiers), function(error, data) {
      if (error) {
        console.log(error);
        callback(error);
        return;
      }
      let responses = data.Responses;
      let items =  data.Responses[process.env.STORIES_DYNAMODB_TABLE];
      if (0 == items.lenght) {
        const response = {
          statusCode: 204,
          headers: {
            "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
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
        stories : stories
      }
      const response = {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
        },
        body: JSON.stringify(body)
      };
      callback(null, response);
    });
  });
};

module.exports.putAllTopStories = (event, context, callback) => {
  const stories = JSON.parse(event.body).stories;
  const tagIdentifier = "TopStories";
  putStories(stories, tagIdentifier, function(error, data) {
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

function query(tagIdentifier, callback) {
  const params = {
      TableName: process.env.TAGS_DYNAMODB_TABLE,
      IndexName: process.env.TAG_IDENTIFIER_DYNAMODB_GSI,
      ProjectionExpression: "hashKey, storyIdentifier, storyPosition",
      KeyConditionExpression: 'tagIdentifier = :tagIdentifier',
      ExpressionAttributeValues: { ':tagIdentifier' : { 'S': tagIdentifier} }
  };
  dynamodb.query(params, function(error, data) {
    if (error) {
      callback(error, null);
      return;
    }
    const result = data.Items.map(function (item) {
      return {hashKey:item.hashKey.S, storyIdentifier: item.storyIdentifier.S, storyPosition:item.storyPosition.N};
    });
    callback(null, result);
  });
}

function putStories(storyIdentifiers, tagIdentifier, callback) {
  query(tagIdentifier, function(error, items) {
    const itemsToDelete = items.filter(function(item) {
      return !storyIdentifiers.includes(item.storyIdentifier);
    });
    const hashKeysToDelete = itemsToDelete.map(function (item) {
      return item.hashKey;
    });
    const requests = deleteRequests(hashKeysToDelete).concat(putRequests(tagIdentifier, storyIdentifiers));
    const params = {
      RequestItems: {
      }
    };
    params.RequestItems[process.env.TAGS_DYNAMODB_TABLE] = requests;
    console.log("batchWriteItem:", params);
    dynamodb.batchWriteItem(params, function(error, data) {
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
          hashKey : {
            S: hashKey
          }
        }
      }
    };
  }
  return deleteRequests;
}

function putRequests(tagIdentifier, storyIdentifiers) {
  var putItems = [];
  for (var position = 0, length = storyIdentifiers.length; position < length; position++) {
    const storyIdentifier = storyIdentifiers[position];
    const storyPosition = position;
    putItems[position] = {
      PutRequest: {
        Item: {
          hashKey : {
            S: tagIdentifier+storyIdentifier
          },
          tagIdentifier : {
            S: tagIdentifier
          },
          storyIdentifier : {
            S: storyIdentifier
          },
          storyPosition : {
            N: storyPosition.toString()
          }
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
      storyIdentifier: {
        S: storyIdentifier
      }
    });
  }
  const request = {
    RequestItems: {
    }
  };
  request.RequestItems[process.env.STORIES_DYNAMODB_TABLE] = {
    Keys: keys,
    ProjectionExpression: "storyIdentifier, revisionIdentifier, storyType, creationDate, modificationDate, publicationDate, title, callout, storyShare"
  };
  return request;
}

function story(item) {
  const story = {
   storyId: item.storyIdentifier.S,
   revisionId: item.revisionIdentifier.S,
   type: item.storyType.S,
   creationDate: item.creationDate.S,
   modificationDate: item.modificationDate.S,
   publicationDate: item.publicationDate.S,
   title: item.title.S,
   callout: JSON.parse(item.callout.S),
   share: JSON.parse(item.storyShare.S)
  }
  return story;
}
