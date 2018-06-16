const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const https = require('https');
const http = require('http');
const mongoose = require("mongoose");
const Promise = require("bluebird");
const cors = require('cors');
const delay = require('delay');


//----------------TweakpickerVars-------
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
//console.log(token);
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(config.token, {polling: true});

let port = process.env.PORT || 8003;

let buttons = {
    reply_markup: JSON.stringify({
        keyboard: [
            [{ text: '/Спросить Чака'}],
        ]
    })
};

app.listen(8003, () => {
    console.log("Server Starts on 8003 port");
});
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

function getJoke(msg) {
    const chatId = msg.chat.id;
    const reqOptions = {
        host: 'api.icndb.com',
        path: '/jokes/random'
    };

    (async () => {


        await delay(500);
        bot.sendMessage(chatId, 'Fetching new joke for you...');
        await delay(500);
        bot.sendMessage(chatId, '...');
        await delay(1000);

        callback = function(response) {
            let str = [];

            //another chunk of data has been recieved, so append it to `str`
            response.on('data', function (chunk) {
                str += chunk;
            });

            //the whole response has been recieved, so we just print it out here
            response.on('end', function () {
                console.log(str);

                let obj = JSON.parse(str);
                let res = obj.value.joke;

                bot.sendMessage(chatId, res);
            });
        }

        http.request(reqOptions, callback).end();

    })();
}





bot.onText(/\/Спросить Чака/, (msg) => {
    // 'msg' is the received Message from Telegram

    getJoke(msg);

});


bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    (async () => {

        await delay(50);
        bot.sendMessage(chatId, 'Received your message', buttons);

    })();

});
