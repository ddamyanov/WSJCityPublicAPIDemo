'use strict';
const request = require('request');
module.exports.invalidate = (event, context, callback) => {
  const options = {
    url: `${event.stageVariables.domain}/${event.stageVariables.stage}/stories`,
    headers: {
      'Cache-Control': 'max-age=0'
    }
  };
  request(options, function (error, response, body) {
    if (error) {
      console.log('error:', error); // Print the error if one occurred
      callback(error);
      return;  
    }
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
    callback(null, {
      statusCode: response.statusCode,
      headers: {
        "Access-Control-Allow-Origin": "*" // Required for CORS support to work
      },
      body: JSON.stringify({
        headers: response.headers,
        body: 200 == response.statusCode ? JSON.parse(body) : body
      })
    });
  });
};
