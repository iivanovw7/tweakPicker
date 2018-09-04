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
import schedule from 'node-schedule'


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
            [{ text: '/PoolStats'}],
            [{ text: '/XMRrates'}],
            [{ text: '/Balance'}],

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

function getPrices(chatID) {

  let prices = 'https://api.nanopool.org/v1/xmr/prices';

  https.get(prices, (res) => {
    res.on('data', (d) => {
      let obj = JSON.parse(d);
      console.log(obj);
      let ratesUSD = obj.data.price_usd;
      let ratesRUR = obj.data.price_rur;

      (async () => {
        await delay (500);
        bot.sendMessage(chatID, "1 XMR = " + ratesUSD + " USD");
        bot.sendMessage(chatID, "1 XMR = " + ratesRUR + " RUR");
      })();

    });
  }).on('error', (e) => {
    console.error(e);
    bot.sendMessage(chatID, "Something went wrong...");
  });

}

function getStats(chatID, RIGid) {



    let request = 'https://api.nanopool.org/v1/xmr/user/'+RIGid;
    let str = [];

    https.get(request, (res) => {
        //console.log('statusCode:', res.statusCode);
        //console.log('headers:', res.headers);

        res.on('data', (d) => {
            str += d;



        });


      res.on('end', (e) => {
      (async () => {

        //process.stdout.write(d);
        let obj = JSON.parse(str);
        console.log(obj);
        let balance = obj.data.balance;
        let hash = obj.data.hashrate;
        let avHash = obj.data.avgHashrate.h6;

        await delay(1000);
        bot.sendMessage(chatID, "Balance: " + balance + " XMR");
        await delay(500);
        bot.sendMessage(chatID, "Hashrate: " + hash + " h/s");
        await delay(500);
        bot.sendMessage(chatID, "Av. Hashrate (6 hours): " + avHash + " h/s");
        await delay(500);
        getPrices(chatID);


      })();
    });
    })



}

function getBalance(chatID, RIGid) {

  let request = 'https://api.nanopool.org/v1/xmr/user/'+RIGid;
  let str = [];

  https.get(request, (res) => {

    res.on('data', (d) => {
      str += d;

    });


    res.on('end', (e) => {
      (async () => {

        let obj = JSON.parse(str);
        console.log(obj);
        let balance = obj.data.balance;

        await delay(1000);
        bot.sendMessage(chatID, "Balance: " + balance + " XMR");

      })();
    });
  })



}


bot.onText(/\/Chuck/, (msg) => {
    // 'msg' is the received Message from Telegram

    getJoke(msg);

});

bot.onText(/\/start/, (msg) => {
    let senderChatID = msg.chat.id;

        bot.sendMessage(senderChatID, 'Dustie started...', buttons);

});

bot.onText(/\/PoolStats/, (msg) => {
    let chatId = config.myChatID;
    let senderChatID = msg.chat.id;

    console.log(chatId);
    console.log(senderChatID);

    if (chatId == senderChatID) {
        (async () => {

            await delay(500);
            bot.sendMessage(chatId, 'Fetching pool stats...', buttons);
            await delay(1000);
            getStats(chatId ,config.RIG01_id)

        })();
    }
    else {
        bot.sendMessage(senderChatID, 'Request rejected, sorry.', buttons);
    }


});


bot.onText(/\/XMRrates/, (msg) => {
  let senderChatID = msg.chat.id;

  (async () => {

    await delay(500);
    bot.sendMessage(senderChatID, 'Fetching XMR rates...', buttons);
    await delay(1000);
    getPrices(senderChatID);


  })();


});

bot.onText(/\/Balance/, (msg) => {
  let chatId = config.myChatID;
  let senderChatID = msg.chat.id;

  console.log(chatId);
  console.log(senderChatID);

  if (chatId == senderChatID) {
    (async () => {

      await delay(500);
      bot.sendMessage(chatId, 'Fetching your balance...', buttons);
      await delay(1000);
      getBalance(chatId ,config.RIG01_id)

    })();
  }
  else {
    bot.sendMessage(senderChatID, 'Request rejected, sorry.', buttons);
  }
});


schedule.scheduleJob('0 21 * * *', () => {
  getBalance(config.myChatID ,config.RIG01_id)
})

schedule.scheduleJob('0 15 * * *', () => {
  getBalance(config.myChatID ,config.RIG01_id)
})

/*

setInterval(function () {
  getStats(config.myChatID ,config.RIG01_id)
}, 1 * 60 * 60 * 1000); // 1 hour

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    (async () => {

        await delay(50);
        bot.sendMessage(chatId, 'Received your message', buttons);

    })();

});


 */
