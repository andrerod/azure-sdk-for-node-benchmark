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
  var messageCount = 0;

  measureTime(function (done) {
    function getNext(primary) {
      serviceBus.receiveSubscriptionMessage(topic, subscription, function (err, receivedMessage) {
        if (err !== 'No messages to receive') {
          ++messageCount;
          getNext(primary);
        } else if (primary) {
          done();
        }
      });
    }

    for (var i = 0; i < 4; i++) {
      getNext(i === 0);
    }
  }, function (elapsedMS) {
    console.log('Received ' + messageCount + ' messages in ' + elapsedMS + ' milliseconds');
    console.log('Average receive rate of ' + (messageCount * 1000 / elapsedMS) + ' messages/second.');
  });
}