const jsdom = require('jsdom');

const {dom, rule, ruleset} = require('./index');


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
  ['link[rel="mask-icon"]', (node) => node.element.href],
]);


const metadataRules = {
  url: canonicalUrlRules,
  title: titleRules,
  icon: iconRules,
};


function getUrlMetadata(url) {
  return new Promise((resolve, reject) => {
    jsdom.env({
      url: url,
      done: function (err, window) {
        if (!window) {
          return
        }
        resolve(Object.keys(metadataRules).map((metadataKey) => {
          const metadataRule = metadataRules[metadataKey];
          return [metadataKey, metadataRule(window.document)];
        }));
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
