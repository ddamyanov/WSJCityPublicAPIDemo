#!/usr/bin/env node
var request = require('request');
var apigUrl = 'https://2jmi87vfk7.execute-api.eu-west-2.amazonaws.com/v1';
request('https://city.wsj.com/v6/stories', function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  var stories = JSON.parse(body).stories;
  imprtStories(stories, 0, function finished() {
    let a = stories.map(function (story) {
      return story.storyId;
    });
    const body = {
      stories: a
    };
    console.log(body);
    const options = {
      url: apigUrl + '/feeds/00000000-0000-0000-0000-000000000000/stories',
      headers: {
        'Authorization': 'Bearer xxx'
      },
      body: body,
      json: true
    };
    request.put(options, function (error, response, body) {
      if (error) {
        console.log(`put error:`, error); // Print the error if one occurred
      }
      if (response) {
        console.log(`put statusCode:`, response.statusCode); // Print the response status code if a response was received
        // console.log(`put headers:`, response.headers);
      }
      if (body) {
        const isJSON = response && response.headers['content-type'] == 'application/json';
        // console.log(`put body:`, isJSON ? JSON.stringify(body) : body);
      }
      console.log('done');
    });
  });
});

function imprtStories(stories, ix, finished) {
  if (!(ix < stories.length)) {
    finished();
    return;
  }
  var story = stories[ix]
  var identifier = story.storyId
  getStoryByIdentifier(identifier, function (identifier, error, response, story) {
    putStoryWithIdentifier(story, identifier, function (identifier, error, response, body) {
      imprtStories(stories, ++ix, finished);
    });
  });
}

function getStoryByIdentifier(identifier, callback) {
  request(`https://city.wsj.com/v6/stories/${identifier}`, function (error, response, body) {
    console.log(`get ${identifier} error:`, error); // Print the error if one occurred
    console.log(`get ${identifier} statusCode:`, response && response.statusCode); // Print the response status code if a response was received
    var mStory = JSON.parse(body).stories[0];
    request(`https://city.wsj.com/stories/${identifier}.json`, function (error, response, body) {
      console.log(`get ${identifier} error:`, error); // Print the error if one occurred
      console.log(`get ${identifier} statusCode:`, response && response.statusCode); // Print the response status code if a response was received
      var wStory = JSON.parse(body);
      wStory.callout = mStory.callout;
      wStory.bodyHtml = mStory.bodyHtml;
      const cards = [];
      for (let card of wStory.cards) {
        if (card.image && card.image.dataUri) {
          delete card.image.dataUri;
        }
        cards.push(card);
      }
      wStory.cards = cards;
      callback(identifier, error, response, wStory);
    });
  });
}

function putStoryWithIdentifier(story, identifier, callback) {
  const options = {
    url: apigUrl + `/stories/${identifier}`,
    headers: {
      'Authorization': 'Bearer xxx'
    },
    body: story,
    json: true
  };
  request.put(options, function (error, response, body) {
    if (error) {
      console.log(`put ${identifier} error:`, error); // Print the error if one occurred
    }
    if (response) {
      console.log(`put ${identifier} statusCode:`, response.statusCode); // Print the response status code if a response was received
      // console.log(`put ${identifier} headers:`, response.headers);
    }
    if (body) {
      const isJSON = response && response.headers['content-type'] == 'application/json';
      // console.log(`put body:`, isJSON ? JSON.stringify(body) : body);
    }
    callback(identifier, error, response, body);
  });
}
