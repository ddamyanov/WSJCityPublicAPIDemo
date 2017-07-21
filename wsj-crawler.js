#!/usr/bin/env node
var request = require('request');
var apigUrl = 'https://27emt3owk8.execute-api.eu-west-2.amazonaws.com/dev';
request('https://city.wsj.com/v6/stories', function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  var stories = JSON.parse(body).stories;
  imprtStories(stories, 0, function finished() {
    let a = stories.map(function(story) {
      return story.storyId;
    });
    const body = {
      stories:a
    };
    console.log(body);
    request.put({url:apigUrl + '/stories', body:body, json:true},function (error, response, body) {
      console.log('put error:', error); // Print the error if one occurred
      console.log('put statusCode:', response && response.statusCode); // Print the response status code if a response was received
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
  request.put({url:apigUrl + `/stories/${identifier}`, body:story, json:true},function (error, response, body) {
    console.log(`put ${identifier} error:`, error); // Print the error if one occurred
    console.log(`put ${identifier} statusCode:`, response && response.statusCode); // Print the response status code if a response was received
    callback(identifier, error, response, body);
  });
}
