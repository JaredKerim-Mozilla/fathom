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
      return maxNode.flavors.get(name).trim();
    }
  }
}


const titleRules = buildRuleset('title', [
  ['meta[property="og:title"]', (node) => node.element.content],
  ['meta[property="twitter:title"]', (node) => node.element.content],
  ['meta[name="hdl"]', (node) => node.element.content],
  ['title', (node) => node.element.text],
]);


function getUrlMetadata(url) {
  const result = new Promise((resolve, reject) => {
    jsdom.env({
      url: url,
      done: function (err, window) {
        if (!window) {
          return
        }
        resolve(titleRules(window.document));
      }
    });
  });
  return result;
}


jsdom.env({
  url: 'http://news.ycombinator.com/',
  done: function (err, window) {
    const document = window.document;


    console.log('HN Links');
    const links = Array.from(document.querySelectorAll('a.storylink')).map((link) => {
      const articleUrl = link.getAttribute('href');
      getUrlMetadata(articleUrl).then((title) => {
        console.log(title);
      });

    });;
  }
});
