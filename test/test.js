'use strict';
/* global describe, before, beforeEach, after, afterEach, it */
/* jshint maxlen: false */

var Promise  = require('bluebird');
var expect   = require('expect.js');
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var lock     = require('../index');
var testSchema = {
  name: String
};

describe('mongoose-lock', function () {
  // Connect to the database
  before(function (done) {
    mongoose.connect('mongodb://127.0.0.1/mongoose-lock-test', done);
  });

  // Delete the database after testing
  after(function (done) {
    mongoose.connection.db.dropDatabase(done);
  });

  // Level 1 tests
  describe('Level 1', function () {

    it('should be locked after maxAttempts have been reached', function (done) {
      var TestSchema = new Schema(testSchema);
      TestSchema.plugin(lock);
      var Test = mongoose.model('Test1', TestSchema);
      var model = new Test({name: 'test1'});
      var testReturnVal = 'test';
      model.incAttempts()
        .then(function (model) {
          expect(model.isLocked).to.be(false);
          return model.incAttempts();
        })
        .then(function (model) {
          expect(model.isLocked).to.be(false);
          return model.incAttempts();
        })
        .then(function (model) {
          expect(model.isLocked).to.be(true);
          return model.incAttempts(testReturnVal);
        })
        .then(function (returnVal) {
          expect(returnVal).to.be(testReturnVal);
        })
        .then(done, done);
    });


    it('should be unlocked after locked time', function (done) {
      this.timeout(5000);
      var TestSchema = new Schema(testSchema);
      TestSchema.plugin(lock, {
        lockTime: 1000
      });
      var Test = mongoose.model('Test2', TestSchema);
      var model = new Test({name: 'test2'});
      model.incAttempts()
        .then(function (model) {
          return model.incAttempts();
        })
        .then(function (model) {
          return model.incAttempts();
        })
        .then(function (model) {
          expect(model.isLocked).to.be(true);
          return new Promise(function (resolve, reject) {
            setTimeout(function () {
              return model.incAttempts(resolve, reject);
            }, 1000);
          });
        })
        .then(function (model) {
          expect(model.isLocked).to.be(false);
        })
        .then(done, done);
    });


    it('should increment using the callback options', function (done) {
      this.timeout(5000);
      var TestSchema = new Schema(testSchema);
      TestSchema.plugin(lock, {
        lockTime: 1000
      });
      var Test = mongoose.model('Test3', TestSchema);
      var model = new Test({name: 'test3'});

      model.incAttempts(function (err, model) {
        if (err) { return done(err); }
        expect(model.isLocked).to.be(false);
        model.incAttempts(function (err, model) {
          if (err) { return done(err); }
          expect(model.isLocked).to.be(false);
          model.incAttempts(function (err, model) {
            if (err) { return done(err); }
            expect(model.isLocked).to.be(true);
            done();
          });
        });
      });
    });

  });
});
