'use strict';

var Promise  = require('bluebird');
var defaults = require('lodash.defaults');

module.exports = function createdAt(schema, options) {
  // http://devsmash.com/blog/implementing-max-login-attempts-with-mongoose

  // Set the default options
  options = options || {};
  defaults(options, {
    attemptsPath  : 'attempts',
    lockUntilPath : 'lockUntil',
    isLockedPath  : 'isLocked',
    incMethod     : 'incAttempts',
    maxAttempts   : 3,
    lockTime      : 1 * 60 * 60 * 1000 // 1 hour
  });

  // Set the path options
  schema
    .path(options.lockUntilPath, Number)
    .path(options.attemptsPath, Number)
    .path(options.attemptsPath)
      .required(true)
      .default(0);

  // Set up the virtual 'isLocked' key
  schema.virtual(options.isLockedPath).get(function () {
    var lockUntil = this.get(options.lockUntilPath);
    return Boolean(lockUntil && lockUntil > Date.now());
  });

  // Set up the increment method
  schema.method(options.incMethod, function (returnVal, cb) {
    // if returnVal is a function and cb isn't passed, make the first argument
    // the callback instead
    if (typeof returnVal === 'function' && !cb) {
      cb = returnVal;
      returnVal = undefined;
    }

    var now       = Date.now();
    var lockUntil = this.get(options.lockUntilPath);
    var attempts  = this.get(options.attemptsPath);
    var isLocked  = this.get(options.isLockedPath);

    // if we have a previous lock that has expired, restart at 1 attempt
    if (lockUntil && lockUntil < now) {
      this.set(options.attemptsPath, 1);
      this.set(options.lockUntilPath, undefined);
    }
    // Otherwise, we're incrementing
    else {
      // increment
      this.set(options.attemptsPath, attempts + 1);
      // Lock the account if we've reached max attempts and it's not locked
      if (attempts + 1 >= options.maxAttempts && !isLocked) {
        this.set(options.lockUntilPath, now + options.lockTime);
      }
    }

    return saveAsync(this).then(function (model) {
      // if there is a returnVal, then return that. Otherwise, return
      // the model.
      return typeof returnVal !== 'undefined' ? returnVal : model;
    }).nodeify(cb);
  });

};

// With the save, it doesn't return a promise, so there's that. No
// support for promises on the save until 4.0
// https://github.com/LearnBoost/mongoose/issues/1431
function saveAsync(doc) {
  return new Promise(function (resolve, reject) {
    doc.save(function (err, doc) {
      /* istanbul ignore if: This should handle errors just fine */
      if (err) { return reject(err); }
      resolve(doc);
    });
  });
}

