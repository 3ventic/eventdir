const express = require('express');
const request = require('request').defaults({
    headers: {
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Client-ID': '5uw0elwbe54vukmp5tnbqpgi9n1c8t',
        'User-Agent': 'eventdir/1.0'
    }
});
const fs = require('fs');
const launchParams = require('./start.js');
const shouldLog = require('./filterfunction.js');

var events = launchParams.events;
var evtId = launchParams.last;
var lfid = evtId;
var nfs = 0;

setInterval(_ => {
    // Find new events
    request({
        uri: 'https://api.twitch.tv/kraken/events/' + evtId,
        json: true
    }, function (error, response, json) {
        if (error) {
            console.error('Request', error);
        } else if (json.status == 404) {
            if (nfs > 100) {
                nfs = 0;
                evtId = lfid + 1;
            } else {
                nfs += 1;
            }
        } else if (json._id) {
            lfid = parseInt(json._id);
            console.log(json._id);
            events[json._id] = json;
            if (shouldLog(json)) {
                fs.appendFile('./events.log', JSON.stringify(json) + '\n', { encoding: 'utf8' }, err => err && console.error('fs', err));
            }
        } else {
            console.error('Unknown json', json);
        }
    });
    evtId += 1;
}, 1000);

setInterval(_ => {
    // Remove past events every hour
    var now = new Date();
    for (var key in events) {
        if (events.hasOwnProperty(key)) {
            if (now - (new Date(events[key].end_time)) > 0) {
                delete events[key];
            }
        }
    }
    fs.writeFile('./start.js', 'module.exports = ' + JSON.stringify({ last: lfid, events: events }), err => err && console.error('fs', err));
}, 60000);

// Express
const app = express();

app.use(express.static('public'));

app.get('/api/events', (req, res) => {
    res.json(events);
});

app.listen(process.env.PORT || 8080);
