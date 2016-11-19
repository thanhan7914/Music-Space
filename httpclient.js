let request = require('request');
let fs = require('fs');
let path = require('path');

let get = function(url, un = false) {
  url = String(url).trim().replace(/^\s*|\s*$/g, '');

  return new Promise(function(r, rj) {
    request({ method: 'GET',
    uri: url,
    gzip: true
    }, function (error, response, body) {
      if (!error && response.statusCode == 200)
        r(body);
      else if(error && un)
        rj(new Error(url + error.message));
      else r('');
    });
  });
}

let proxyQuery = function(url, host = '123.30.238.16', port = '3128') {
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
