const jsdom = require('jsdom');

const {dom, rule, ruleset} = require('./index');

const titleRules = ruleset(
    rule(dom('meta[property="og:title"]'),
         node => [{score: 40, flavor: 'title', notes: node.element.content}]),
    rule(dom('meta[property="twitter:title"]'),
         node => [{score: 30, flavor: 'title', notes: node.element.content}]),
    rule(dom('meta[name="hdl"]'),
         node => [{score: 20, flavor: 'title', notes: node.element.content}]),
    rule(dom('title'),
         node => [{score: 10, flavor: 'title', notes: node.element.text}])
);
//const titleKB = titleRules.score(doc);
//const titleNode = kb.max('title');


jsdom.env({
  url: 'http://news.ycombinator.com/',
  done: function (err, window) {
    const document = window.document;


    console.log('HN Links');
    const links = Array.from(document.querySelectorAll('a.storylink')).map((link) => {
      const articleUrl = link.getAttribute('href');

      jsdom.env({
        url: articleUrl,
        done: function (err, window) {
          if (!window) {
            return
          }
          console.log(articleUrl);
          const articleDocument = window.document;
          const titleKB = titleRules.score(articleDocument);
          const titleNode = titleKB.max('title');
          if (titleNode) {
            console.log(titleNode.flavors.get('title'));
          }
          console.log('---------')
        }
      });
    });;
  }
});
