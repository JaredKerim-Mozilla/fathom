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


const metadataRules = {
  url: canonicalUrlRules,
  title: titleRules,
  description: descriptionRules,
  icon: iconRules,
  image: imageRules,
};


function getUrlMetadata(url) {
  return new Promise((resolve, reject) => {
    jsdom.env({
      url: url,
      done: function (err, window) {
        if (!window) {
          return
        }

        const metadata = buildObj(Object.keys(metadataRules).map((metadataKey) => {
          const metadataRule = metadataRules[metadataKey];
          return [metadataKey, metadataRule(window.document)];
        }));

        metadata.iconColor = null;

        if (!metadata.url) {
          metadata.url = url;
        }

        if (!metadata.icon) {
          const parsedUrl = urlparse.parse(url);
          metadata.icon = parsedUrl.protocol + '//' + parsedUrl.host + '/favicon.ico';
        }

        const iconColorPromise = getUrlColor(metadata.icon);
        const imageColorPromise = getUrlColor(metadata.image);
        Promise.all([iconColorPromise, imageColorPromise]).then(([iconColor, imageColor]) => {
          metadata.iconColor = iconColor;
          metadata.imageColor = imageColor;
          resolve(metadata);
        });
      }
    });
  });
}


jsdom.env({
  url: 'http://news.ycombinator.com/',
  done: function (err, window) {
    const document = window.document;


    console.log('HN Links');
    const links = Array.from(document.querySelectorAll('a.storylink')).map((link) => {
      const articleUrl = link.getAttribute('href');
      getUrlMetadata(articleUrl).then((title) => {
        console.log('-------------');
        console.log(articleUrl);
        console.log(title);
        console.log('-------------');
      });

    });;
  }
});
