let httpClient = require('./httpclient');
let cheerio = require('cheerio');
let fs = require('fs');
let path = require('path');

let queryurl = 'http://m.mp3.zing.vn/tim-kiem/bai-hat.html?q=';
let zing = 'http://m.mp3.zing.vn';
let api = 'http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata=';

if(typeof String.prototype.addslashes === 'undefined')
  String.prototype.addslashes = function() {
    return this.replace(/\'/g,'\\\'').replace(/\"/g,'\\\"');
  }

let getLink = function(target) {
  let id = path.basename(target, '.html');
  let url = `${zing}${target}`;

  return httpClient.get(url)
  .then(function(body) {
    let $ = cheerio.load(body);
    let link = $('#mp3Player').attr('xml');
    if(typeof link === 'undefined')
    {
      url = `${api}{"id":"${id}"}`;
      return httpClient.proxyQuery(url)
      .then(function(jbody) {
        let obj = JSON.parse(jbody);
        return obj.source['128'];
      });
    }

    return httpClient.get(link)
    .then(function(json) {
      let obj = JSON.parse(json);
      return obj.data[0].source;
    });
  })
  .catch(function(err) {
    throw err;
  });
}

let find = function(query, offset = 0) {
  if(/^[#]/.test(query))
    return findSong(query.substring(1), 'artist', offset);
  else
    return findSong(query, 'title', offset);
}

let findSong = function(query, t, offset = 0) {
  query = query.trim().replace(/\s/g, '+');
  query = `${queryurl}${query}&search_type=bai-hat&t=${t}&act=more&offset=${offset}`;

  return httpClient.get(query)
  .then(function(body) {
    let json = JSON.parse(body);
    let html = json.html.replace(/\r\n\t|\r|\t|\n/g, '');
    let $ = cheerio.load(html);
    let url = $('a');
    let len = url.length;
    let data = [];
    data.push({items: json.items, total: json.total, last: offset, href: '/bai-hat/skip-this', title: 'none', singer: 'unknow'});
    for(let i = 0; i < len; i++)
    {
      let obj = $(url[i]);
      data.push({ href : obj.attr('href'), title : $(obj.find('h3')).text(), singer : $(obj.find('h4')).text()})
    }

    return data;
  })
  .catch(function(err) {
    throw err;
  });
}

let queryApi = function(target) {
  let id = path.basename(target, '.html');
  let url = `${api}{"id":"${id}"}`;

  return httpClient.get(url)
  .then(function(body) {
    let obj = JSON.parse(body);
    if(!obj.source.hasOwnProperty('128'))
      return httpClient.proxyQuery(url)
      .then(function(jbody) {
        obj = JSON.parse(jbody);
        return obj;
      });

    return obj;
  })
  .catch(function(err) {
    throw err;
  });
}

let readFile = function(filename, plaintext = false) {
  return new Promise(function(r, rj) {
    fs.readFile(__dirname + filename, (err, datas) => {
      if (err) rj(err);
      if(plaintext) r(datas);
      datas = `[${datas}]`;
      datas = JSON.parse(datas);
      datas = Array.prototype.slice.call(datas);
      r(datas);
    });
  });
}

let appendFile = function(filename, datas) {
  return new Promise(function(r, rj) {
    let content = `,\r\n${JSON.stringify(datas)}`;

    fs.appendFile(__dirname + filename, content, 'utf8', function(err) {
      if(err) rj(err);
      r();
    });
  });
}

let findInLocal = (datas, filter, un = false) => {
  return datas.filter(function(obj, id) {
    if(un && obj.href === filter) return true;
    if(!un && obj.title.match(filter)) return true;
    return false;
  });
}

let changeAlias = function(alias) {
    var str = String(alias);
    str= str.toLowerCase();
    str= str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a");
    str= str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e");
    str= str.replace(/ì|í|ị|ỉ|ĩ/g,"i");
    str= str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o");
    str= str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u");
    str= str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y");
    str= str.replace(/đ/g,"d");
    str= str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'| |\"|\&|\#|\[|\]|~|$|_/g,"-");
    str= str.replace(/-+-/g,"-");
    str= str.replace(/^\-+|\-+$/g,"");
    return str.replace(/-/g, ' ');
}

let convert = function(alias) {
  var str = changeAlias(alias);
  str= str.replace(/a/g,"(a|à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ)");
  str= str.replace(/e/g,"(e|è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ)");
  str= str.replace(/i/g,"(i|ì|í|ị|ỉ|ĩ)");
  str= str.replace(/o/g,"(o|ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ)");
  str= str.replace(/u/g,"(u|ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ)");
  str= str.replace(/y/g,"(y|ỳ|ý|ỵ|ỷ|ỹ)");
  str= str.replace(/d/g,"(d|đ)");

  return str;
}


exports.find = find;
exports.getLink = getLink;
exports.get = httpClient.get;
exports.download = httpClient.download;
exports.convert = convert;
exports.findInLocal = findInLocal;
exports.appendFile = appendFile;
exports.readFile = readFile;
exports.queryApi = queryApi;
