# mongoose-lock

[![io.js compatibility](https://img.shields.io/badge/io.js-compatible-brightgreen.svg?style=flat)](https://iojs.org/)
[![NPM version](http://img.shields.io/npm/v/mongoose-lock.svg?style=flat)](https://www.npmjs.org/package/mongoose-lock)

[![Dependency Status](http://img.shields.io/david/ksmithut/mongoose-lock.svg?style=flat)](https://gemnasium.com/ksmithut/mongoose-lock)
[![Dev Dependency Status](http://img.shields.io/david/dev/ksmithut/mongoose-lock.svg?style=flat)](https://gemnasium.com/ksmithut/mongoose-lock)
[![Code Climate](http://img.shields.io/codeclimate/github/ksmithut/mongoose-lock.svg?style=flat)](https://codeclimate.com/github/ksmithut/mongoose-lock)
[![Build Status](http://img.shields.io/travis/ksmithut/mongoose-lock.svg?style=flat)](https://travis-ci.org/ksmithut/mongoose-lock)
[![Coverage Status](http://img.shields.io/codeclimate/coverage/github/ksmithut/mongoose-lock.svg?style=flat)](https://codeclimate.com/github/ksmithut/mongoose-lock)

A mongoose plugin to track usage attempts (could be login attempts) and add a
virtual 'isLocked' property that you can use to prevent access to certain
functionality.

# Usage

```javascript
'use strict';

var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

// Obviously, you'd want more robust way of handling user authentication.
// Still need password hashing, and all that fun stuff.
var UserSchema = new Schema({
  email: String,
  password: String
});

UserSchema.plugin(require('mongoose-lock'));

UserSchema.static('authenticate', function (email, password) {
  this.findOne({email: email}).exec().then(function (user) {
    if (!user) { return false; }
    // Account is locked, increment the attempts again, and return false
    if (user.isLocked) { return user.incAttempts(false); }
    // Again, please use password hashing
    if (user.password === password) {
      // password matched, return the user
      return user;
    } else {
      // password didn't match, increment the attempts, and return false
      return user.incAttempts(false);
    }
  });
});
```

So the things that this plugin adds:

`attempts` property. This is used to keep track of failed attempts.

`lockUntil` property. This is used to keep track of how long the model should
be locked for.

`isLocked` virtual property. This is a helper to help you know if the model is
locked.

`incAttempts([returnVal] [, cb])` instance method. This increments (or resets)
the attempts. If a returnVal is passed, the callback (or promise) will pass this
returnValue straight through. Otherwise, the updated model is passed. The
callback is optional if you would rather use promises.

To pass in options:

```javascript
UserSchema.plugin(require('mongoose-lock'), {
  attemptsPath  : 'attempts',
  lockUntilPath : 'lockUntil',
  isLockedPath  : 'isLocked',
  incMethod     : 'incAttempts',
  maxAttempts   : 3,
  lockTime      : 1 * 60 * 60 * 1000 // 1 hour
});
```

# Options

* `attemptsPath` (String) - The property path for the attempts property.
  Default: `'attempts'`
* `lockUntilPath` (String) - The property path for the lockUntil property.
  Default: `'lockUntil'`
* `isLockedPath` (String) - The virtual property path for the isLocked
  property. Default: `'isLocked'`
* `incMethod` (String) - The name of the instance method that increments (or
  resets the attempts property). Default: `'incAttempts'`
* `maxAttempts` (Number) - The maximum number of failed attempts before the
  isLocked property is set.
* `lockTime` (Number) - The amount of time (in milliseconds) the model is
  'locked' for. Default: `1 * 60 * 60 * 1000` or 1 hour
