let express = require('express');
let util = require('./util');
let app = express();
let server = require('http').Server(app);
let port = process.env.PORT || 80;
let path = require('path');
let eaudio = require('./engine');
let favicon = require('serve-favicon');
let fs = require('fs');

app.use('/assets',express.static( __dirname + '/public_html')); //nginx
app.use(favicon(__dirname + '/favicon.ico'));
app.engine('eng', eaudio.__engine__);
app.set('views', __dirname + '/views');
app.set('view engine', 'eng');

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/copy.html', function(req, res) {
  //##
  res.render('copy');
});

app.get('/get=:id', function(req, res) {
  let id = req.params.id;

  util.queryApi(id)
  .then(function(obj) {
    let data = {};
    let listen;
    data.href = obj.link;
    data.singer = obj.artist;
    data.title = obj.title;
    listen = `
    <listen>${JSON.stringify(data)}</listen>
    `;

    res.render('index', {listen});
  })
  .catch(function(err) {
    console.log(err);
    res.render('index');
  });
});

server.listen(port, function(){
  console.log(`application run on port ${port}`);
});

let audios = [];
let lyrics = [];

Promise.all([
  util.readFile('/audios.ms')
  .then(function(datas) {
    datas.forEach((doc, idx) => {
      doc.title = doc.title.replace(/\/n|\/r/g, '').trim();
      doc.singer = doc.singer.replace(/\/n|\/r/g, '').trim();
      audios.push(doc);
    });
//    audios = datas;
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
io.on('connection',function(socket) {
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
    if(/^[A-Z0-9]{8}$|^[A-Z0-9]{8}(\.html)$/.test(query))
    {
      return util.queryApi(query)
      .then(function(obj) {
        if(!obj.hasOwnProperty('link')) return socket.emit('found-out', [{}]);
        let data = {href: obj.link, singer: obj.artist, title: obj.title};
        let datas = [];
        datas.push({items: 1, total: 1, last: 0, href: '/bai-hat/skip-this', title: 'none', singer: 'unknow'});
        datas.push(data);
        socket.emit('found-out', datas);
      });
    }

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
            if(String(obj.singer).match(pattern)) return true;
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
      //socket.emit('play', datas);
      io.emit('play', datas);
      return;
    }

    let name = path.basename(target, '.html') + '.mp3';
    let localFiles = util.findInLocal(audios, name, true);
    if(localFiles.length > 0)
    {
      //socket.emit('play', localFiles[0]);
      localFiles[0].type = datas.type;
      io.emit('play', localFiles[0]);
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

        //socket.emit('play', datas);
        io.emit('play', datas);
      });
    })
    .catch(function(err) {
      socket.emit('msg', err.message);
      console.log(err);
    });
  });

  socket.on('fileExists', function(datas) {
    if(typeof datas === 'string') datas = {href: datas};
    if(!datas.hasOwnProperty('href')) return socket.emit('fileExists', false);
    let name = path.basename(datas.href, '.html');
    name += name.endsWith('.mp3') ? '' : '.mp3';
    let localFiles = util.findInLocal(audios, name, true);
    if(localFiles.length > 0)
      return socket.emit('fileExists', true);

    socket.emit('fileExists', false);
  });

  socket.on('lyrics', function(datas) {
    if(typeof datas !== 'object' || !datas.hasOwnProperty('href') || !datas.hasOwnProperty('title') || !datas.hasOwnProperty('singer') || datas.href.length < 10)
    {
      socket.emit('tomanyrequest');
      return;
    }

    let target = datas.href;
    let name = path.basename(target, '.html');
    if(!name.endsWith('.mp3')) name += '.mp3';
    let localFiles = util.findInLocal(lyrics, name, true);
    if(localFiles.length !== 0)
    {
        socket.emit('lyrics', util.readFileSync(`/public_html/lyrics/${localFiles[0].lyrics}`));
        return;
    }

    console.log(target);

    return util.queryApi(target)
    .then(function(obj) {
      if(typeof obj === 'object' && obj.hasOwnProperty('lyrics_file'))
      {
        name = path.basename(obj.lyrics_file);
        if(name === '') throw 'no lyrics';

        return util.download(obj.lyrics_file, __dirname + '/public_html/lyrics', name)
        .then(function() {
          let datas = {href: target, lyrics: name};
          util.appendFile('/lyrics.ms', datas)
          .then(function() {
            lyrics.push(datas);
          });

           socket.emit('lyrics', util.readFileSync(`/public_html/lyrics/${name}`));
        });
      }
    })
    .catch(function(err) {
        socket.emit('lyrics', 'no lyrics');
      //  console.log(err);
    });
  });

  //init files
  socket.on('files', function(dir) {
    dir = String(dir);
    dir += dir.endsWith('/') ? '' : '/';
    if(!util.fileExistsSync(dir)) return;

    let files = '';
    let idx = 1;

    audios.forEach(function(obj) {
      let newname = util.vi2en(obj.title).trim().replace(/\s/g, '_') + '-' + util.vi2en(obj.singer).trim().replace(/\s/g, '_') + '.mp3';
      if(util.fileExistsSync(dir + newname)) return;

      files += `<li data='${JSON.stringify(obj).addslashes()}'> ${idx++}. ${obj.title} - ${obj.singer}</li>`;
    });

    socket.emit('files', {files, dir});
  });
  //#copy
  socket.on('copy', function(obj) {
    if(!obj.hasOwnProperty('href') || !obj.hasOwnProperty('title') || !obj.hasOwnProperty('singer') || !obj.hasOwnProperty('dir')) return socket.emit('copy', 'input error');
    let dir = String(obj.dir);
    dir += dir.endsWith('/') ? '' : '/';
    if(!util.fileExistsSync(dir)) return socket.emit('copy', 'dir not exists');

    let name = path.basename(path.basename(obj.href, '.html'), '.mp3') + '.mp3';
    let newname = util.vi2en(obj.title).trim().replace(/\s/g, '_') + '-' + util.vi2en(obj.singer).trim().replace(/\s/g, '_') + '.mp3';
    util.copyFilePromise(__dirname + '/public_html/audios/' + name, dir + newname)
    .then(function() {
      socket.emit('copy', newname);
    })
    .catch(function(err) {
      console.log(err);
      socket.emit('copy', err.message);
    });
  })
});
