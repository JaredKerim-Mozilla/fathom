const jsdom = require('jsdom');
const getUrlColor = require('./image');
const urlparse = require('url');

const {dom, rule, ruleset} = require('./index');


function buildObj(pairs) {
  return pairs.reduce((newObj, [key, value]) => {
    newObj[key] = value;
    return newObj;
  }, {});
}

function buildRuleset(name, rules) {
  const reversedRules = Array.from(rules).reverse();
  const builtRuleset = ruleset(...reversedRules.map(([query, handler], order) => rule(
    dom(query),
    node => [{
      score: order,
      flavor: name,
      notes: handler(node)
    }]
  )));

  return (document) => {
    const kb = builtRuleset.score(document);
    const maxNode = kb.max(name);
    if (maxNode) {
      const value = maxNode.flavors.get(name);
      if (value) {
        return value.trim();
      }
    }
  }
}


const titleRules = buildRuleset('title', [
  ['meta[property="og:title"]', (node) => node.element.content],
  ['meta[property="twitter:title"]', (node) => node.element.content],
  ['meta[name="hdl"]', (node) => node.element.content],
  ['title', (node) => node.element.text],
]);

const canonicalUrlRules = buildRuleset('url', [
  ['meta[property="og:url"]', (node) => node.element.content],
  ['link[rel="canonical"]', (node) => node.element.href],
]);


const iconRules = buildRuleset('icon', [
  ['link[rel="apple-touch-icon"]', (node) => node.element.href],
  ['link[rel="apple-touch-icon-precomposed"]', (node) => node.element.href],
  ['link[rel="icon"]', (node) => node.element.href],
  ['link[rel="fluid-icon"]', (node) => node.element.href],
  ['link[rel="shortcut icon"]', (node) => node.element.href],
  ['link[rel="Shortcut Icon"]', (node) => node.element.href],
  ['link[rel="mask-icon"]', (node) => node.element.href],
]);

const imageRules = buildRuleset('image', [
  ['meta[property="og:image"]', (node) => node.element.content],
  ['meta[property="twitter:image"]', (node) => node.element.content],
  ['meta[name="thumbnail"]', (node) => node.element.content],
  ['img', (node) => node.element.src],
]);

const descriptionRules = buildRuleset('description', [
  ['meta[name="description"]', (node) => node.element.content],
  ['meta[property="og:description"]', (node) => node.element.content],
]);

const typeRules = buildRuleset('type', [
  ['meta[property="og:type"]', (node) => node.element.content],
]);


const metadataRules = {
  type: typeRules,
  url: canonicalUrlRules,
  title: titleRules,
  description: descriptionRules,
  favicon_url: iconRules,
  image: imageRules,
};


function getUrlMetadata(url) {
  return new Promise((resolve, reject) => {
    jsdom.env({
      url: url,
      done: function (err, window) {
        if (!window) {
          reject(err);
        }

        const metadata = buildObj(Object.keys(metadataRules).map((metadataKey) => {
          const metadataRule = metadataRules[metadataKey];
          return [metadataKey, metadataRule(window.document)];
        }));

        metadata.url = url;
        metadata.original_url = url;
        metadata.provider_url = url;

        if (!metadata.favicon_url) {
          const parsedUrl = urlparse.parse(url);
          metadata.favicon_url = parsedUrl.protocol + '//' + parsedUrl.host + '/favicon.ico';
        }

        const iconColorPromise = getUrlColor(metadata.favicon_url);
        const imageColorPromise = getUrlColor(metadata.image);
        Promise.all([iconColorPromise, imageColorPromise]).then(([iconColor, imageColor]) => {
          metadata.favicon_colors = [{
            color: iconColor,
            weight: 0.0,
          }];
          metadata.images = [{
            url: metadata.image,
            colors: [{
              color: imageColor,
              weight: 0.0,
            }],
          }];
          resolve(metadata);
        });
      }
    });
  });
}


//jsdom.env({
//  url: 'http://news.ycombinator.com/',
//  done: function (err, window) {
//    const document = window.document;
//
//
//    console.log('HN Links');
//    const links = Array.from(document.querySelectorAll('a.storylink')).map((link) => {
//      const articleUrl = link.getAttribute('href');
//      getUrlMetadata(articleUrl).then((title) => {
//        console.log('-------------');
//        console.log(articleUrl);
//        console.log(title);
//        console.log('-------------');
//      });
//
//    });;
//  }
//});

var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json()); // for parsing application/json

app.post('/', function (req, res) {
  const promises = req.body.urls.map((url) => {
    console.log('requesting ' + url);
    return getUrlMetadata(url);
  });
  console.log('promises ' + promises);
  Promise.all(promises).then((urlsData) => {
    console.log('received data ' + JSON.stringify(urlsData));
    res.format({
      'application/json': () => {
        res.send(JSON.stringify({
          error: '',
          urls: buildObj(urlsData.map((urlData) => [urlData.url, urlData]))
        }));
      }
    });
  });
});

app.listen(7001, function () {
  console.log('Example app listening on port 3000!');
});
