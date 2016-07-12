let express = require('express');
let util = require('./util');
let app = express();
let server = require('http').Server(app);
let port = process.env.PORT || 80;
let path = require('path');
let eaudio = require('./engine');
let favicon = require('serve-favicon');
let fs = require('fs');

let audios = [];

app.use('/assets',express.static( __dirname + '/public_html')); //nginx
app.use(favicon(__dirname + '/favicon.ico'));
app.engine('eng', eaudio.__engine__);
app.set('views', __dirname + '/views');
app.set('view engine', 'eng');

app.get('/', function(req, res) {
  res.render('index');
});

server.listen(port, function(){
  console.log(`application run on port ${port}`);
});

util.loadData(__dirname + '/audios.txt')
.then(function(datas) {
  audios = Array.prototype.slice.call(datas);
  console.log('done read datas.');
})
.catch(function(err) {
  console.log(err);
});

var delay = 350;
var request = {};
var isLimit = function(id) {
  let rf = (Date.now() - request[id].time < delay);
  if(!rf)
  {
    request[id].time = Date.now();
    request[id].count++;
  }

  return rf;
}
let io = require('socket.io')(server);
io.on('connection', function(socket) {
  let id = socket.request.connection.remoteAddress;
  //add
  request[id] = {
  tmark : Date.now(),
  count : 0,
  time : Date.now()
  };

  socket.on('find', function(query) {
    if(isLimit(id) || typeof query !== 'string' || query.length < 3)
    {
      socket.emit('tomanyrequet');
      return;
    }

    util.find(query)
    .then(function(datas) {
      datas = datas.filter(function(obj) {
        if(obj.href.startsWith('/bai-hat')) return true;
        return false;
      });
      let localDatas = util.findInLocal(audios, new RegExp(util.convert(query), 'i'));
      for(let i of localDatas) datas.unshift(i);
      socket.emit('found-out', datas);
    });
  });

  socket.on('play', function(datas) {
    if(isLimit(id) || typeof datas !== 'object' || !datas.hasOwnProperty('href') || !datas.hasOwnProperty('title') || !datas.hasOwnProperty('singer') || datas.href.length < 10)
    {
      socket.emit('tomanyrequet');
      return;
    }
    let target = datas.href;

    if(target.endsWith('.mp3'))
    {
      socket.emit('play', datas);
      return;
    }

    let name = path.basename(target, '.html') + '.mp3';
    let fileLocals = util.findInLocal(audios, name, true);
    if(fileLocals.length > 0)
    {
      socket.emit('play', fileLocals[0]);
      return;
    }

    util.getLink(target)
    .then(function(link) {
      if(typeof link === 'undefined' || link.length === 0) throw err;

      return util.download(link, __dirname + '/public_html/audios', name)
      .then(function() {
        datas.href = name;
        util.saveData(audios, datas, function() {
          audios.push(datas);
        });
        socket.emit('play', datas);
      });
    })
    .catch(function(err) {
      socket.emit('msg', err.message);
      console.log(err);
    });
  });
});
