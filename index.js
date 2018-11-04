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
const moment = require('moment');

let randomId = require('random-id');
let len = 20;
let pattern = '0';

//--------database related imports---------
let Item = require('./db/index');
const mongoose = require("mongoose");
let mongoLogin = require('./mongo');

//----------------TweakpickerVars---------------------------------
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
//accuWeather st/petersburg location id---------------------------
const stP = '2515373';
const getOneDayForecast = require('./forecasts.js');
//console.log(token);
// Create a bot that uses 'polling' to fetch new updates----------
const bot = new TelegramBot(config.token, {polling: true});



let shoppingList = [
  {id: 1, title: 'Товар 1'},
  {id: 2, title: 'Товар 2'},
];


let buttons = {
  reply_markup: JSON.stringify({
    keyboard: [
      [{text: '/Список покупок'}],
      [{text: '/Прогноз погоды'}],
      [{text: '/Chuck'}],
      [{text: '/Service'}],
    ]
  })
};



app.listen(8005, () => {
  console.log("Server Starts on 8003 port");
});

mongoose.connect(mongoLogin.dbRoot(), {}, () => {
  console.log(
    `dbRoot: ${mongoLogin.dbRoot()}`
  );
  console.log("DB is connected");
});


app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//Main functions -----------------------------------------------------------------

bot.onText(/\/start/, (msg) => {
  let senderChatID = msg.chat.id;

  bot.sendMessage(senderChatID, 'Dustie started...', buttons);

});


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


bot.onText(/\/Chuck/, (msg) => {

  getJoke(msg);

});


//Scheduled functions----------------------------------------------------------

schedule.scheduleJob('0 6 * * *', () => {
  getBalance(config.myChatID, config.RIG01_id)
});

schedule.scheduleJob('0 12 * * *', () => {
  getBalance(config.myChatID, config.RIG01_id)
});

schedule.scheduleJob('0 15 * * *', () => {
  getBalance(config.myChatID, config.RIG01_id)
});


//-----------------------------------------------------------------------------

//Service menu functions-------------------------------------------------------

//Service menu keyboard

let serviceKeyboard_Open = false;
const serviceActions = new ReplyKeyboard();

serviceActions
  .addRow("/Get_ChatID")
  .addRow("/PoolStats")
  .addRow("/XMRrates")
  .addRow("/Balance")
  .addRow("/Назад");

bot.onText(/\/Service/, (msg) => {
  let chatId = msg.chat.id;
  let myChatId = config.myChatID;
  let sashaChatId = config.sashaChatID;


  if (chatId == myChatId || chatId == sashaChatId) {
    (async () => {

      bot.sendMessage(chatId, "Service menu...", serviceActions.open())
        .then(function () {
          serviceKeyboard_Open = !serviceKeyboard_Open;
        });

    })();
  }
  else {
    bot.sendMessage(chatId, 'Request rejected, sorry.', buttons);
  }

});

bot.onText(/\/Get_ChatID/, (msg) => {
  let senderChatID = msg.chat.id;

  bot.sendMessage(senderChatID, senderChatID, serviceActions.open());

});

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
        bot.sendMessage(chatID, "1 XMR = " + ratesUSD + " USD", serviceActions.open());
        bot.sendMessage(chatID, "1 XMR = " + ratesRUR + " RUR", serviceActions.open());
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

    res.on('data', (d) => {
      str += d;

    });


    res.on('end', (e) => {
      (async () => {


        let obj = JSON.parse(str);
        console.log(obj);
        let balance = obj.data.balance;
        let hash = obj.data.hashrate;
        let avHash = obj.data.avgHashrate.h6;

        await delay(1000);
        bot.sendMessage(chatID, "Balance: " + balance + " XMR", serviceActions.open());
        await delay(500);
        bot.sendMessage(chatID, "Hashrate: " + hash + " h/s", serviceActions.open());
        await delay(500);
        bot.sendMessage(chatID, "Av. Hashrate (6 hours): " + avHash + " h/s", serviceActions.open());
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
        bot.sendMessage(chatID, "Balance: " + balance + " XMR", serviceActions.open());

      })();
    });
  })

}



bot.onText(/\/PoolStats/, (msg) => {
  let chatId = config.myChatID;
  let senderChatID = msg.chat.id;

  console.log(chatId);
  console.log(senderChatID);

  (async () => {

    await delay(500);
    bot.sendMessage(chatId, 'Fetching pool stats...', serviceActions.open());
    await delay(1000);
    getStats(chatId, config.RIG01_id, msg, senderChatID)

  })();


});


bot.onText(/\/XMRrates/, (msg) => {

  let senderChatID = msg.chat.id;

  (async () => {

    await delay(500);
    bot.sendMessage(senderChatID, 'Fetching XMR rates...', serviceActions.open());
    await delay(1000);
    getPrices(senderChatID);

  })();

});

bot.onText(/\/Balance/, (msg) => {
  let chatId = config.myChatID;
  let senderChatID = msg.chat.id;

  console.log(chatId);
  console.log(senderChatID);

  (async () => {

    await delay(500);
    bot.sendMessage(chatId, 'Fetching your balance...', serviceActions.open());
    await delay(1000);
    getBalance(chatId, config.RIG01_id)

  })();

});



//Weather forecast function-------------------------------------------

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


};



bot.onText(/\/Прогноз погоды/, (msg) => {
  renderForecast(msg)
});




//------------------------Shopping List functions-----------------------------------
//----------------------------------------------------------------------------------



let is_listActions_Open = false;
const listActions = new ReplyKeyboard();

listActions
  .addRow("/Покажи весь список")
  .addRow("/Добавить новый товар")
  .addRow("/Удалить товар")
  .addRow("/Назад");


//Rendering shopping list menu

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

//Return to main menu

bot.onText(/\/Назад/, (msg) => {
  let chatId = msg.chat.id;


  (async () => {

    bot.sendMessage(chatId, "Возвращаю в главное меню...", listActions.close())
      .then(function () {
        is_listActions_Open = !is_listActions_Open;
      });
    await delay(500);
    bot.sendMessage(chatId, 'Выполнено', buttons);

  })();

});


//Shows items list

bot.onText(/\/Покажи весь список/, (msg) => {
  let chatId = msg.chat.id;


  (async () => {

    bot.sendMessage(chatId, "Ваш списочек:", listActions.open())
      .then(function () {
        renderShoppingList(chatId)
      });

  })();

});


//Add new item to the list

bot.onText(/\/Добавить новый товар/, (msg) => {
  let chatId = msg.chat.id;

  (async () => {

    bot.sendMessage(chatId, "Что хотите добавить ?", (new ForceReply()).export());


  })();

});

bot.on("message", function (msg) {
  let chatId = msg.chat.id;
  let date = moment().format('dddd, MMMM Do YYYY');

  function saveData(index) {
    let item = new Item(index);
    item.save();
  }


  if (!!msg.reply_to_message) {

    (async () => {
      await delay(500);
      bot.sendMessage(chatId, "Ок, добавляем " + msg.text, listActions.open());
      await delay(500);

      let NewItem = {
        _id: randomId(len, pattern),
        title: msg.text,
        posted_at: date
      };
      await delay(500);
      saveData(NewItem);
      await delay(500);
      bot.sendMessage(msg.from.id, "Ваш список теперь выглядит так: ", listActions.open());
      await delay(500);
      renderShoppingList(chatId);
      await delay(500);
      sendListNotifications(msg.from.id, "добавлен", msg.text);
    })();

  }

});

//Remove item from the list

bot.onText(/\/Удалить товар/, (msg) => {
  let toDeleteListing = new InlineKeyboard();
  let chatId = msg.chat.id;
  let items = [];

  Item.find({}, function(err, Items){
    if (err)
      return (
        bot.sendMessage(chatId, 'Что то пошло не так =(')
      );
    if (Items) {

      if (Items.length === 0) {
        bot.sendMessage(chatId, 'Список пуст!', listActions.open());
      } else {
        console.log("Items count : " + Items.length);
        console.log(Items);
        items = Items;

        renderToDeleteList()
      }

    }
  });

  function renderToDeleteList() {
    _.map(items, element => {
      toDeleteListing
        .addRow(
          {text: element.title.toString(), callback_data: element._id.toString()}
        );
    });
  }

  (async () => {

    await delay(500);
    bot.sendMessage(chatId, "Что удаляем ?", toDeleteListing.export());


  })();

});

bot.on("callback_query", function(query) {
  bot.answerCallbackQuery(query.id, { text: "Удаляем элемент"})
    .then(function() {
      removeElement(query.data, query.from.id, "удален")
    })
    .then(function() {
      bot.sendMessage(query.from.id, "Элемент удален из вашего списка");
    })

});

//show full shopping list

renderShoppingList = (chatId) => {

  let items = [];
  let list = '';
  let nmb = 1;

  Item.find({}, function(err, Items){
    if (err)
      return (
        bot.sendMessage(chatId, 'Что то пошло не так =(')
      );
    if (Items) {

      if (Items.length === 0) {
        bot.sendMessage(chatId, 'Список пуст!', listActions.open());
      } else {
        console.log("Items count : " + Items.length);
        console.log(Items);
        items = Items;

        renderFinalList()
      }

    }
  });

  function renderFinalList() {

    _.map(items, element => {
      list += element.title + '\n';
      nmb++
    });

    if (items.length === 0) {
      bot.sendMessage(chatId, 'Список пуст!');
    } else {
      bot.sendMessage(chatId, list, listActions.open());
    }
  }



};




//function removes element from shopping list by item ID

removeElement = (index, user, action) => {

  let value = parseInt(index, 10);

  function removeByKey(params){


    Item.findByIdAndRemove(params.value, function(err) {
      if (err) {
        return done(err);
      }
    });


  }

  Item.findById(value, function (err, item) {
    if (err) {
      return done(err);
    }
    if (item) {
      (async () => {
        sendListNotifications(user, action, item.title);
        await delay(1000);
        removeByKey({value: value});
      })();

    }
  });



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

};



