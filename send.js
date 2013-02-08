// Simple app to throw data up onto a service bus topic

var azure = require('azure');

var topic = process.argv[2];
var subscription = process.argv[3];

console.log('Writing messages to service bus');

var serviceBus = azure.createServiceBusService();

serviceBus.createTopic(topic, function () {
  serviceBus.createSubscription(topic, subscription, function () {
    for(var i = 0; i < 1000; ++i) {
      var message = 'client message ' + i;

      serviceBus.sendTopicMessage(topic, message, function (err) {
        if (err) {
          console.log('Failed to write message ' + message + ' to service bus, error ' + err.message);
        }
      })
    }
  });
});
