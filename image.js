const ColorThief = require('color-thief');
const request = require('request');
const urlparse = require('url');

const exec = require('child_process').exec;
const md5 = require('md5');
const path = require('path');
const temp = require('temp');

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
        const iconFilename = path.basename(urlparse.parse(url).path);

        console.log('found ico ' + iconFilename);

        temp.track();
        temp.mkdir(md5(url), function(err, dirPath) {
          const cmd = 'cd ' + dirPath + ';wget ' + url + ';icotool -x -o . ' + iconFilename + ';ls -I ' + iconFilename + ' | head -n 1';
          console.log('executing command ' + cmd);

          exec(cmd, function(error, stdout, stderr) {
            // command output is in stdout
            const imageFilename = stdout.trim();

            if (!imageFilename) {
              console.log('unpacked zero icons!');
              resolve([0, 0, 0]);
              return;
            }

            const iconPath = path.join(dirPath, imageFilename);
            console.log('reading unpacked image ' + iconPath);
            const color = colorThief.getColor(iconPath);
            console.log('found ico color ' + color);
            resolve(color);
            return;
          });
        });
      } else {
        resolve([0, 0, 0]);
        return;
      }

    });
  });
}


module.exports = getUrlColors;
