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
let lyrics = [];

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

Promise.all([
  util.readFile('/audios.ms')
  .then(function(datas) {
    audios = datas;
  }),
  util.readFile('/lyrics.ms')
  .then(function(datas) {
    lyrics = datas;
  })
])
.then(function() {
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

  socket.on('find', function(query, offset) {
    if(isLimit(id) || typeof query !== 'string' || query.length < 3)
    {
      socket.emit('tomanyrequest');
      return;
    }

    if(typeof offset !== 'number' || offset.toString() === 'NaN') offset = 0;

    util.find(query, offset)
    .then(function(datas) {
      if(offset === 0)
      {
        let detail = datas.shift();
        let localDatas;
        if(/^[#]/.test(query))
        {
          let pattern = new RegExp(util.convert(query.substring(1)), 'i');
          localDatas = audios.filter(function(obj) {
            if(obj.singer.match(pattern)) return true;
            return false;
          });
        }
        else localDatas = util.findInLocal(audios, new RegExp(util.convert(query), 'i'));
        for(let i of localDatas) datas.unshift(i);
        detail.items = datas.length;
        datas.unshift(detail);
      }
      socket.emit('found-out', datas);
    })
    .catch(function(err) {
      console.log(err);
    });
  });

  socket.on('play', function(datas) {
    if(isLimit(id) || typeof datas !== 'object' || !datas.hasOwnProperty('href') || !datas.hasOwnProperty('title') || !datas.hasOwnProperty('singer') || datas.href.length < 10)
    {
      socket.emit('tomanyrequest');
      return;
    }

    let target = datas.href;
    if(target === '/bai-hat/skip-this') return;

    if(target.endsWith('.mp3'))
    {
      socket.emit('play', datas);
      return;
    }

    let name = path.basename(target, '.html') + '.mp3';
    let localFiles = util.findInLocal(audios, name, true);
    if(localFiles.length > 0)
    {
      socket.emit('play', localFiles[0]);
      return;
    }

    util.getLink(target)
    .then(function(link) {
      if(typeof link === 'undefined' || link.length === 0) throw 'nullpointererror';

      return util.download(link, __dirname + '/public_html/audios', name)
      .then(function() {
        datas.href = name;

        util.appendFile('/audios.ms', datas)
        .then(function() {
          audios.push(datas);
        })
        .catch(function(err) {
          console.log(err);
        });

        socket.emit('play', datas);
      });
    })
    .catch(function(err) {
      socket.emit('msg', err.message);
      console.log(err);
    });
  });

  socket.on('lyrics', function(datas) {
    if(isLimit(id) || typeof datas !== 'object' || !datas.hasOwnProperty('href') || !datas.hasOwnProperty('title') || !datas.hasOwnProperty('singer') || datas.href.length < 10)
    {
      socket.emit('tomanyrequest');
      return;
    }

    let target = datas.href;
    let name = path.basename(target, '.html') + '.mp3';
    let localFiles = util.findInLocal(lyrics, name, true);
    if(localFiles.length !== 0)
    {
      socket.emit('lyrics', localFiles[0].lyrics);
      return;
    }

    return util.queryApi(target)
    .then(function(obj) {
      if(typeof obj === 'object' && obj.hasOwnProperty('lyrics_file'))
      {
        name = path.basename(obj.lyrics_file);

        return util.download(obj.lyrics_file, __dirname + '/public_html/lyrics', name)
        .then(function() {
          let datas = {href: target, lyrics: name};
          util.appendFile('/lyrics.ms', datas)
          .then(function() {
            lyrics.push(datas);
          });

          socket.emit('lyrics', obj.lyrics_file);
        })
        .catch(function(err) {
          console.log(err);
        });
      }

      socket.emit('lyrics', 'no lyrics');
    });
  });
});
