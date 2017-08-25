'use strict';
const request = require('request');
module.exports.invalidate = (event, context, callback) => {
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*" // Required for CORS support to work
    },
    body: JSON.stringify(event)
  };
  callback(null, response);
};
