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
            [{ text: '/Chuck'}],
            [{ text: '/RIG01'}],
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
        };

        http.request(reqOptions, callback).end();

    })();
}

function getStats(chatID, RIGid) {


    let str = [];
    let request = 'https://api.nanopool.org/v1/xmr/user/'+RIGid;

    https.get(request, (res) => {
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);

        res.on('data', (d) => {
            //process.stdout.write(d);
            let obj = JSON.parse(d);
            console.log(obj);
            let balance = obj.data.balance;
            let hash = obj.data.hashrate;

            (async () => {

                bot.sendMessage(chatID, "RIG01 stats: ");
                await delay(500);
                bot.sendMessage(chatID, "Balance: " + balance + " XMR");
                await delay(500);
                bot.sendMessage(chatID, "Hashrate: " + hash + " h/s");

            })();





        });

    }).on('error', (e) => {
        console.error(e);
    });

}


bot.onText(/\/Chuck/, (msg) => {
    // 'msg' is the received Message from Telegram

    getJoke(msg);

});

bot.onText(/\/RIG01/, (msg) => {
    let chatId = config.myChatID;
    let senderChatID = msg.chat.id;

    console.log(chatId);
    console.log(senderChatID);

    if (chatId == senderChatID) {
        (async () => {

            await delay(500);
            bot.sendMessage(chatId, 'Fetching rig stats...', buttons);
            await delay(1000);
            getStats(chatId ,config.RIG01_id)

        })();
    }
    else {
        bot.sendMessage(senderChatID, 'Request rejected, sorry.', buttons);
    }




});

setInterval(function () {
    getStats(config.myChatID ,config.RIG01_id)
}, 1 * 60 * 60 * 1000); // 1 hour



/*

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    (async () => {

        await delay(50);
        bot.sendMessage(chatId, 'Received your message', buttons);

    })();

});


 */
