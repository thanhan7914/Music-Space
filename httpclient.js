let request = require('request');
let fs = require('fs');
let path = require('path');

let get = function(url) {
  url = String(url).trim().replace(/^\s*|\s*$/g, '');

  return new Promise(function(r, rj) {
    request.get(url, function (error, response, body) {
      if (!error && response.statusCode == 200)
        r(body);
      else if(error)
        rj(new Error(url + error.message));
    });
  });
}

let proxyQuery = function(url) {
  let host = '118.69.66.63';
  let port = '8080';
  var proxyUrl = "http://" + host + ":" + port; //+ user + ":" + password + "@"
  var proxiedRequest = request.defaults({'proxy': proxyUrl});

  return new Promise(function(r, rj) {
    proxiedRequest.get(url, function (err, resp, body) {
      if (!err && resp.statusCode == 200)
        r(body);
      else if(err)
        rj(new Error(url + err.message));
    });
  });
}

let post = function(url, form) {
  return new Promise(function(r, rj) {
    request.post({url, form}, function (error, response, body) {
      if (!error && response.statusCode == 200)
        r(body);
      else if(error)
        rj(new Error(url + error.message));
    });
  });
}

let download = function(url, folder, filename) {
  url = String(url).trim().replace(/^\s*|\s*$/g, '');

  return new Promise(function(r, rj) {
    let req = request(url);
    req.pipe(fs.createWriteStream(path.format({
      dir : folder,
      base : (typeof filename === 'string' ? filename : path.basename(url))
    })));

    req.on('end', function() {
      r();
    });

    req.on('error', function(err) {
      rj(err);
    });
  });
}

exports.get = get;
exports.download = download;
exports.proxyQuery = proxyQuery;
exports.post = post;
