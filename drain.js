// Draining messages from subscription

var azure = require('azure');
var cluster = require('cluster');
var http = require('http');
var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  var topic = process.argv[2];
  var subscription = process.argv[3];

  console.log('starting to drain messages');

  function measureTime(fn, done) {
    var start = +new Date(),
      stop;

      fn(function () {
        stop = +new Date();
        done(stop - start);
      });
  }

  var serviceBus = azure.createServiceBusService();
  var receivedCount = 0;
  var scheduleMore = true;
  var scheduledMessages = 0;

  measureTime(function (done) {
    function getNext() {
      serviceBus.receiveSubscriptionMessage(topic, subscription, function (err, receivedMessage) {
        if (err !== 'No messages to receive') {
          ++receivedCount;
        } else if (scheduleMore) {
          scheduleMore = false;
          done();
        }
      });

      ++scheduledMessages;
      if (scheduleMore) {
        if (scheduledMessages < 1000) {
          getNext();
        } else if (receivedCount >= 1000) {
          // schedule 1000 more once the previous 1000 are received
          scheduledMessages = 0;
        }
      }
    }

    getNext();
  }, function (elapsedMS) {
    console.log('Received ' + receivedCount + ' messages in ' + elapsedMS + ' milliseconds');
    console.log('Average receive rate of ' + (receivedCount * 1000 / elapsedMS) + ' messages/second.');
  });
}