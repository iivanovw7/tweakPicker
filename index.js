const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const https = require('https');
const http = require('http');
const delay = require('delay');
const schedule = require('node-schedule');
const {InlineKeyboard, ReplyKeyboard, ForceReply} = require('node-telegram-keyboard-wrapper');
const _ = require('lodash');


//----------------TweakpickerVars---------------------------------
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
//accuWeather st/petersburg location id---------------------------
const stP = '2515373';
const getOneDayForecast = require('./forecasts.js');
//console.log(token);
// Create a bot that uses 'polling' to fetch new updates----------
const bot = new TelegramBot(config.token, {polling: true});

let port = process.env.PORT || 8003;
let shoppingList = [
  {id: 1, title: 'Товар 1'},
  {id: 2, title: 'Товар 2'},
];

let buttons = {
  reply_markup: JSON.stringify({
    keyboard: [
      [{text: '/Список покупок'}],
      [{text: '/Chuck'}],
      [{text: '/Get_ChatID'}],
      [{text: '/PoolStats'}],
      [{text: '/XMRrates'}],
      [{text: '/Balance'}],
      [{text: '/Прогноз погоды'}],

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

    callback = function (response) {
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
        await delay(500);
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


  let request = 'https://api.nanopool.org/v1/xmr/user/' + RIGid;
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


  let request = 'https://api.nanopool.org/v1/xmr/user/' + RIGid;
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

  getJoke(msg);

});

bot.onText(/\/Get_ChatID/, (msg) => {
  let senderChatID = msg.chat.id;

  bot.sendMessage(senderChatID, senderChatID, buttons);

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
      getStats(chatId, config.RIG01_id, msg, senderChatID)

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
      getBalance(chatId, config.RIG01_id)

    })();
  }
  else {
    bot.sendMessage(senderChatID, 'Request rejected, sorry.', buttons);
  }
});

renderForecast = (msg) => {
  let chatId = msg.chat.id;


  (async () => {

    await delay(500);
    bot.sendMessage(chatId, 'Fetching your forecast...', buttons);
    await delay(500);
    getOneDayForecast(config.accuKEY, stP, 'forecast');
    await delay(2000);
    let forecast = require('./forecast.json');

    if (forecast.Code === 'ServiceUnavailable') {
      bot.sendMessage(chatId, 'Превышено максимальное количество запросов', buttons);
    } else {
      await delay(500);
      bot.sendMessage(chatId, 'Санкт-Петербург', buttons);
      await delay(500);
      //bot.sendMessage(chatId, 'На завтра:', buttons);
      //await delay(500);
      //bot.sendMessage(chatId, forecast.Headline.Text, buttons);
      //await delay(500);
      //bot.sendMessage(chatId, 'Полный прогноз: ' + forecast.Headline.MobileLink, buttons);
      //await delay(500);
      let i = forecast.DailyForecasts[0];
      //console.log(forecast.DailyForecasts[0].Date)
      //console.log(forecast.DailyForecasts[1])
      //bot.sendMessage(chatId, 'На сегодня:', buttons);
      await delay(500);
      bot.sendMessage(chatId, 'Ночь: ' + i.Temperature.Minimum.Value + ' C, ' + ' День: ' + i.Temperature.Maximum.Value + ' C', buttons);
      await delay(500);
      bot.sendMessage(chatId, 'Ощущается ночью: ' + i.RealFeelTemperature.Minimum.Value + ' C', buttons);
      await delay(500);
      bot.sendMessage(chatId, 'Ощущается днем: ' + i.RealFeelTemperature.Maximum.Value + ' C', buttons);
      //bot.sendMessage(chatId, 'Ощущается в тени: '+ 'Ночь - ' + i.RealFeelTemperatureShade.Minimum.Value + ' C,' + ' День - ' + i.RealFeelTemperatureShade.Maximum.Value + ' C', buttons);
      await delay(500);
      bot.sendMessage(chatId, 'Днем: ' + i.Day.LongPhrase, buttons);
      await delay(500);
      bot.sendMessage(chatId, 'Ночью: ' + i.Night.LongPhrase, buttons);
      await delay(500);
      bot.sendMessage(chatId, 'Полный прогноз: ' + i.MobileLink, buttons);
    }

  })();


}

bot.onText(/\/Прогноз погоды/, (msg) => {
  renderForecast(msg)
});

schedule.scheduleJob('0 6 * * *', () => {
  getBalance(config.myChatID, config.RIG01_id)
});

schedule.scheduleJob('0 12 * * *', () => {
  getBalance(config.myChatID, config.RIG01_id)
});

schedule.scheduleJob('0 15 * * *', () => {
  getBalance(config.myChatID, config.RIG01_id)
});


//------------------------Shopping List functions-----------------
//----------------------------------------------------------------


let is_listActions_Open = false;
const listActions = new ReplyKeyboard();

listActions
  .addRow("/Покажи весь список")
  .addRow("/Добавить новый товар")
  .addRow("/Удалить товар")
  .addRow("/Назад");


//rendering shopping list menu-----------------------------------
bot.onText(/\/Список покупок/, (msg) => {
  let chatId = msg.chat.id;
  let myChatId = config.myChatID;
  let sashaChatId = config.sashaChatID;


  if (chatId == myChatId || chatId == sashaChatId) {
    (async () => {

      bot.sendMessage(chatId, "Выберете действие со списком покупок...", listActions.open())
        .then(function () {
          is_listActions_Open = !is_listActions_Open;
        });

    })();
  }
  else {
    bot.sendMessage(chatId, 'Request rejected, sorry.', buttons);
  }

});

//return to main menu----------------------------------------------
bot.onText(/\/Назад/, (msg) => {
  let chatId = msg.chat.id;
  let myChatId = config.myChatID;
  let sashaChatId = config.sashaChatID;


  if (chatId == myChatId || chatId == sashaChatId) {
    (async () => {

      bot.sendMessage(chatId, "Возвращаю в главное меню...", listActions.close())
        .then(function () {
          is_listActions_Open = !is_listActions_Open;
        });
      await delay(500);
      bot.sendMessage(chatId, 'Выполнено', buttons);

    })();
  }
  else {
    bot.sendMessage(chatId, 'Request rejected, sorry.', buttons);
  }

});


//Show items list--------------------------------------------------
bot.onText(/\/Покажи весь список/, (msg) => {
  let chatId = msg.chat.id;
  let myChatId = config.myChatID;
  let sashaChatId = config.sashaChatID;


  if (chatId == myChatId || chatId == sashaChatId) {
    (async () => {

      bot.sendMessage(chatId, "Ваш списочек:", listActions.open())
        .then(function () {
          renderShoppingList(chatId)
        });

    })();
  }
  else {
    bot.sendMessage(chatId, 'Request rejected, sorry.', buttons);
  }

});


//Add new item to the list----------------------------------------
bot.onText(/\/Добавить новый товар/, (msg) => {
  let chatId = msg.chat.id;
  let myChatId = config.myChatID;
  let sashaChatId = config.sashaChatID;


  if (chatId == myChatId || chatId == sashaChatId) {
    (async () => {

      bot.sendMessage(chatId, "Что хотите добавить ?", (new ForceReply()).export());


    })();
  }
  else {
    bot.sendMessage(chatId, 'Request rejected, sorry.', buttons);
  }

});

bot.on("message", function (msg) {
  let chatId = msg.chat.id;
  let myChatId = config.myChatID;
  let sashaChatId = config.sashaChatID;

  function getNewItemId() {
    console.log(_.maxBy(shoppingList, 'id').id + 1)

    return _.maxBy(shoppingList, 'id').id + 1
  }

  if (!!msg.reply_to_message) {

    if (chatId == myChatId || chatId == sashaChatId) {
      (async () => {
        await delay(500);
        bot.sendMessage(chatId, "Ок, добавляем " + msg.text, listActions.open());
        await delay(500);
        shoppingList.push({id: getNewItemId(), title: msg.text});
        await delay(500);
        bot.sendMessage(msg.from.id, "Ваш новый список: ", listActions.open());
        await delay(500);
        renderShoppingList(chatId);
        await delay(500);
        sendListNotifications(msg.from.id, "добавлен", msg.text);
      })();
    }
    else {
      bot.sendMessage(chatId, 'Request rejected, sorry.', buttons);
    }

  }

});

//Remove item from the list----------------------------------------
bot.onText(/\/Удалить товар/, (msg) => {
  let toDeleteListing = new InlineKeyboard();
  let chatId = msg.chat.id;
  let myChatId = config.myChatID;
  let sashaChatId = config.sashaChatID;


  _.map(shoppingList, element => {
    toDeleteListing
      .addRow(
        {text: element.title.toString(), callback_data: element.id.toString()}
      );
  });


  if (chatId == myChatId || chatId == sashaChatId) {
    (async () => {

      await delay(500);
      bot.sendMessage(chatId, "Что удаляем ?", toDeleteListing.export());


    })();
  }
  else {
    bot.sendMessage(chatId, 'Request rejected, sorry.', buttons);
  }

});

bot.on("callback_query", function(query) {
  bot.answerCallbackQuery(query.id, { text: "Удаляем элемент " + query.data })
    .then(function() {
      removeElement(query.data)
    })
    .then(function() {
      bot.sendMessage(query.from.id, "Элемент удален из вашего списка");
    })
    .then(function() {
      sendListNotifications(query.from.id, "удален", query.message);
    })

});

//show full shopping list-------------------------------------------
renderShoppingList = (chatId) => {

  let list = '';
  let nmb = 1;

  _.map(shoppingList, element => {
    list += nmb + ' ' + element.title + '\n';
    nmb++
  });


  if (shoppingList.length === 0) {
    bot.sendMessage(chatId, 'Список пуст!');
  } else {
    bot.sendMessage(chatId, list, listActions.open());
  }

};

//function removes element from shopping list by item ID
removeElement = (index) => {

  function removeByKey(array, params){
    array.some(function(item, index) {
      if(array[index][params.key] === params.value){
        array.splice(index, 1);
      }
    });
    return array;
  }

  let value = parseInt(index, 10);

  removeByKey(shoppingList, {key: 'id', value: value});


};

//function sends notifications to users about changed shopping list
sendListNotifications = (user, action, element) => {
  let recipientID = 0;
  if (user == config.myChatID) {
    recipientID = config.sashaChatID
  } else recipientID = config.myChatID;

  if (action == 'удален') {
    bot.sendMessage(recipientID, element + ' ' + action + ' из вашего списка!', buttons);
  } else {
    bot.sendMessage(recipientID, element + ' ' + action + ' в ваш список!', buttons);
  }

}

