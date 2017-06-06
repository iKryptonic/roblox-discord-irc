const Discord = require('discord.js');
const express = require('express');

const BOT_TOKEN = '';
const CHANNEL_ID = '';
const MAX_BUFFER_LENGTH = 100;

const messageBuffer = [];
var messageFlushQueue = [];

var broadcastTimeout = null;
var watchers = {};
var id = 1;

const client = new Discord.Client();
const app = express();

function newMessageArrived(msg) {
    console.log('got new message', msg.author, msg.content);

    messageBuffer.push(msg);
    messageFlushQueue.push(msg);

    while (messageBuffer.length > MAX_BUFFER_LENGTH) {
        messageBuffer.shift();
    }

    if (broadcastTimeout === null) {
        broadcastTimeout = setTimeout(broadcastToWatchers, 1000);
    }
}

function broadcastToWatchers() {
    broadcastTimeout = null;
    var currentWatchers = watchers;
    const latestMessages = JSON.stringify(messageFlushQueue);

    messageFlushQueue = [];
    watchers = {};

    Object.keys(currentWatchers).forEach(function (watcherId) {
        const watcher = currentWatchers[watcherId];
        watcher.res.send(latestMessages);
        clearTimeout(watcher.timeout);
    });
}

client.on('message', function (msg) {
    if (msg.channel.id === CHANNEL_ID) {
        newMessageArrived({
            'id': msg.id,
            'content': msg.content,
            'author': {
                'id': msg.author.id,
                'username': msg.author.username,
                'discriminator': msg.author.discriminator,
                'avatar': msg.author.avatar
            }
        });
    }
});

client.on('ready', function () {
    console.log('Logged in as ' + client.user.username);
});


client.login(BOT_TOKEN);

app.get('/messages', function (req, res) {
    const afterId = req.query.after;
    if (afterId == null) {
        res.send(JSON.stringify(messageBuffer));
        return;
    }

    const eligibleMessages = [];
    messageBuffer.forEach(function (msg) {
        if (afterId < msg.id) {
            eligibleMessages.push(msg);
        }
    });

    if (eligibleMessages.length > 0) {
        console.log('flushing already');
        res.send(JSON.stringify(eligibleMessages));
        return;
    }

    const watcherId = id++;
    watchers[watcherId] = {
        res: res,
        timeout: setTimeout(function () {
            delete watchers[watcherId];
            res.send(JSON.stringify([]))
        }, 30000)
    }
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
});