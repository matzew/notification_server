/**
 * PUSH Notification server
 * (c) Telefonica Digital, 2012 - All rights reserved
 * License: GNU Affero V3 (see LICENSE file)
 * Fernando Rodríguez Sela <frsela@tid.es>
 * Guillermo Lopez Leal <gll@tid.es>
 */

var dataStore = require('../../common/datastore'),
    msgBroker = require('../../common/msgbroker'),
    log = require('../../common/logger'),
    errorcodes = require('../../common/constants').errorcodes.GENERAL,
    errorcodesAS = require('../../common/constants').errorcodes.AS,
    uuid = require('node-uuid');

var kMozASFrontendVersion = 'v1';

/**
 * Check if a version is a valid one for this API (v1)
 * In v1 case:
 *   - should be a number
 *   - should not be NaN
 *   - should be greater or equal than 0
 */
var isVersion = function(version) {
  var number = parseInt(version);
  if (typeof number !== 'number') {
    return false;
  }

  if (isNaN(number)) {
    return false;
  }

  if (number < 0) {
    return false;
  }

  return true;
}

var SimplePushAPI_v1 = function() {
  this.processRequest = function(request, body, response) {
    var URI = request.url.split('/');
    if (URI.length < 3) {
      response.statusCode = 404;
      response.end('{ reason: "Not enough path data"}');
      log.debug('NS_UA_Moz_v1::processMozRequest --> Not enough path');
      return;
    }

    if (URI[1] !== kMozASFrontendVersion) {
      response.statusCode = 400;
      response.end('{ reason: "Protocol version not supported"}');
      log.debug('NS_UA_Moz_v1::processMozRequest --> Version not supported, received: ' + URI[1]);
      return;
    }

    if (URI[2] !== 'notify') {
      response.statusCode = 404;
      response.end('{ reason: "API not known"}');
      log.debug('NS_UA_Moz_v1::processMozRequest --> API call not known, received: ' + URI[2]);
      return;
    }

    var appToken = URI[3];
    if (!appToken) {
      response.statusCode = 404;
      response.end('{ reason: "Not enough path data"}');
      log.debug('NS_UA_Moz_v1::processMozRequest --> Not enough path');
      return;
    }

    var versions = String(body).split('=');
    if (versions[0] !== 'version') {
      response.statusCode = 404;
      response.end('{ reason: "Bad body"}');
      log.debug('NS_UA_Moz_v1::processMozRequest --> Bad body, received lhs: ' + versions[0]);
      return;
    }

    var version = versions[1]
    if (!isVersion(version)) {
      response.statusCode = 404;
      response.end('{ reason: "Bad version"}');
      log.debug('NS_UA_Moz_v1::processMozRequest --> Bad version, received rhs: ' + version);
      return;
    }

    //Now, we are safe to start using the path and data
    log.notify('appToken=' + appToken + ' -- version=' + version);
    dataStore.getChannelIDForAppToken(appToken, function(error, channelID) {
      var msg = dataStore.newVersion(appToken, channelID, version);
      msgBroker.push('newMessages', msg);
      response.statusCode = 200;
      response.end('{}');
      return;
    });
  };
};

module.exports = SimplePushAPI_v1;