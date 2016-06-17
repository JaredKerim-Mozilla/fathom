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
  console.log('getting colors for ' + url);
  return new Promise((resolve, reject) => {
    console.log('requesting content for ' + url);
    request.get({ url: url, encoding: null }, function(err, res, body) {
      if (err) {
        resolve([0, 0, 0]);
        return;
      }

      console.log('received binary color data for ' + url);

      if (url.substr(url.length - 4) === '.svg') {
        console.log('failing fast for svg for ' + url);
        resolve([0, 0, 0]);
        return;
      }

      if (url.substr(url.length - 4) === '.png') {
        try {
          console.log('getting png color data for ' + url);
          const color = colorThief.getColor(body);
          console.log('received png color data for ' + url);
          resolve(color);
        } catch(err) {
          console.log('rejecting png ' + err);
          resolve([0, 0, 0]);
        }
        return;
      }

      if (url.substr(url.length - 4) === '.ico') {
        resolve([0, 0, 0]);
        return;
        console.log('creating buffer');
        const buffer = new Uint8Array(body).buffer;
        console.log('buffer created');

        try {
          console.log('begging ico parse');
          ICO.parse(buffer).then(images => {
            console.log('ico parsed');
            const imageBuffer = toBuffer(images[0].buffer);
            const color = colorThief.getColor(imageBuffer);
            console.log('received ico color data for ' + url);
            resolve(color);
          }, (err) => resolve([0, 0, 0]));
        } catch (err) {
          console.log('rejecting ico ' + err);
          resolve([0, 0, 0]);
        }
        return;
      }

      resolve([0, 0, 0]);
      return;
    });
  });
}


module.exports = getUrlColors;
