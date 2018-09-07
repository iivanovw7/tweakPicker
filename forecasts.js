const fetch = require('node-fetch');
const fs = require('fs');

module.exports = function getOneDayForecast(apiKey, locationID, index) {

  fetch(`http://dataservice.accuweather.com/forecasts/v1/daily/1day/${locationID}?apikey=${apiKey}&language=ru-RU&details=true&metric=true`)
    .then(res => res.json())
    .then(json => {
      delete require.cache[require.resolve(`./${index}.json`)];
      fs.writeFile(`${index}.json`, JSON.stringify(json, null, 2), function () {

        return JSON.stringify(json, null, 2);

      });
    })
    .catch(error => console.error(error));

};


