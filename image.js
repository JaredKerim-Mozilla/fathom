const ColorThief = require('color-thief');
const request = require('request');
const ICO = require('icojs');

const colorThief = new ColorThief();


function toBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}


function getUrlColors(url) {
  return new Promise((resolve, reject) => {
    request.get({ url: url, encoding: null }, function(err, res, body) {
        if (url.substr(url.length - 4) === '.ico') {
          const buffer = new Uint8Array(body).buffer;

          try {
            ICO.parse(buffer).then(images => {
              const imageBuffer = toBuffer(images[0].buffer);
              const color = colorThief.getColor(imageBuffer);
              resolve(color);
            });
          } catch (err) {
          }
        } else {
          try {
            const color = colorThief.getColor(body);
            resolve(color);
          } catch(err) {
          }
        }

    });
  });
}


module.exports = getUrlColors;
