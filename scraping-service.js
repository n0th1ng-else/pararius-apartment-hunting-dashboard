'use strict';

const EventEmitter = require("events");
const puppeteer = require('puppeteer');
const cheerio = require("cheerio");
const throttledQueue = require('throttled-queue');

const config = require("./config");
const {fetchPicture, fetchAptUrl, fetchAptPath, fetchAptAgent, fetchSurface, fetchRooms,
  fetchInterior, fetchStatus, fetchAptName, fetchAptPrice, fetchAptAddress, getId
} = require("./utils/scrap");
const {LIST_HEADER} = require("./utils/selectors");
const {getLocationUrl} = require("./utils/map");
const {getTimestamp} = require("./utils/time");

const throttle = throttledQueue(config.parariusMaxRequestPerSecond, 1000);

const URL_REGEX = /^(https:\/\/)(www.)?(pararius.com\/apartments)(\/(?!page)[a-zA-z0-9\-]+)+(\/page\-\d{0,2})?(\/?)/;
const MAX_RESULT = config.maxScrapingResults;
const CAPTCHA_TIMEOUT = 5 * 60 * 1000;

module.exports = class ScrapingService extends EventEmitter {

  constructor(url, updateFrequency) {
    super();
    this.scrapingWorker = null;
    this.url = url;
    this.updateFrequency = updateFrequency < 15 ? 15 : updateFrequency;
    this.isWorking = false;
    this._sanitizeUrl();
  }

  start() {
    if (this._isUrlValid() && !this.isWorking) {
      let self = this;
      this.stop();
      this._startScraping();
      this.scrapingWorker = setInterval(() => {
        if (!self.isWorking)
          self._startScraping();
      }, this.updateFrequency * 60 * 1000);
    }
  }


  stop() {
    if (this.scrapingWorker) clearInterval(this.scrapingWorker);
    this.isWorking = false;
  }

  _fetchWebsite(pageNumber) {
    let self = this;
    var promise = new Promise(function (resolve, reject) {
      let br;
      throttle(() => {
        puppeteer.launch({ headless: false, protocolTimeout: CAPTCHA_TIMEOUT })
            .then(browser => {
              br = browser;
              return browser.newPage()
            })
            .then(page => {
              return page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36')
                  .then(() => page.goto(self.url + pageNumber, { waitUntil: 'networkidle0'}))
                  .then(() => page.waitForSelector(LIST_HEADER, {timeout: CAPTCHA_TIMEOUT}))
                  .then(() => page.content())
                  .then(data => {
                    resolve(cheerio.load(data));
                  })
                  .finally(() => br.close())
            })
            .catch(err => reject(err))
      })
    });
    return promise;
  }

  _isUrlValid() {
    return URL_REGEX.test(this.url);
  }

  _startScraping() {
    this.isWorking = true;
    let self = this;
    self.emit("start")
    self._fetchWebsite(1).then(($) => {
      self._scrap($);
      let count = parseInt($("div.search-results-wrapper > div.header > p.count").clone().children().remove().end().text())
      count = count > MAX_RESULT ? MAX_RESULT : count
      const pages = Math.ceil(count / 30)
      if (pages > 1) {
        let unProcessedPages = pages - 1;
        for (let i = 2; i <= pages; i++) {
          self._fetchWebsite(i).then(($) => {
            unProcessedPages--;
            self._scrap($)
            if (unProcessedPages === 0 && self.isWorking) {
              self.isWorking = false;
              self.emit("end")
            }
          }).catch((error) => {
            unProcessedPages--;
            self.emit("error", error)
            if (unProcessedPages === 0 && self.isWorking) {
              self.isWorking = false;
              self.emit("end")
            }
          });
        }
      } else {
        self.isWorking = false;
        self.emit("end");
      }
    }).catch(error => {
      self.emit("error", error)
      self.isWorking = false;
      self.emit("end");
    });
  }

  _sanitizeUrl() {
    if (this._isUrlValid()) {
      this.url = this.url.match(URL_REGEX)[0];
      const matchingGroups = this.url.match(URL_REGEX);
      if (matchingGroups[5] && matchingGroups[5].length > 0) {
        this.url = this.url.substring(0, this.url.indexOf("/page-"));
      }
      this.url = this.url + "/page-"
    }
  }

  _scrap($) {
    const self = this;
    $("ul.search-list li.search-list__item--listing").each((_, element) => {
      const picture = fetchPicture($, element);
      const id = getId(fetchAptPath($, element));
      const price = fetchAptPrice($, element)
      const name = fetchAptName($, element);
      const url = fetchAptUrl($, element);
      const {zipCode, city, neighborhood} = fetchAptAddress($, element);
      const {name: agentName, link: agentUrl} = fetchAptAgent($, element)
      const surfaceArea = fetchSurface($, element);
      const bedrooms = fetchRooms($, element);
      const furniture = fetchInterior($, element);
      const availability = fetchStatus($, element);
      const discoveryDate =  getTimestamp();
      const locationUrl = getLocationUrl(zipCode, city);

      const property = {
        id,
        price,
        name,
        url,
        zipCode,
        city,
        neighborhood,
        picture,
        agentName,
        agentUrl,
        surfaceArea,
        bedrooms,
        furniture,
        availability,
        discoveryDate,
        locationUrl,
      }

      self.emit("property", property)
    });
  }
}