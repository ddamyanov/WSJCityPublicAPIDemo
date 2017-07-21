'use strict';

module.exports.replay = (event, context, callback) => {
  console.log(event);
  callback(null, {event:event});
};
