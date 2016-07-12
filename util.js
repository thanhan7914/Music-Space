let httpClient = require('./httpclient');
let cheerio = require('cheerio');
let fs = require('fs');
let readline = require('readline');
let path = require('path');

let url = 'http://m.mp3.zing.vn/tim-kiem/bai-hat.html?q=';
let zing = 'http://m.mp3.zing.vn';
let api = 'http://api.mp3.zing.vn/api/mobile/song/getsonginfo?requestdata=';

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


let find = function(query) {
  query = query.trim().replace(/\s/g, '+');

  return httpClient.get(`${url}${query}`)
  .then(function(body) {
    let $ = cheerio.load(body);
    let result = $('#fnBodyContent');
    let url = result.find('.content-items');
    let title = result.find('h3');
    let singer = result.find('h4');
    let len = url.length;
    let data = [];
    for(let i = 0; i < len; i++)
      data.push({ href : $(url[i]).attr('href'), title : $(title[i]).text(), singer : $(singer[i]).text()})

    return data;
  })
  .catch(function(err) {
    throw err;
  });
}

let saveData = function(datas, obj, callback) {
  let un = findInLocal(datas, obj.href, true);
  if(un.length > 0) return;

  let href = obj.href;
  let title = obj.title.replace(/\#/g, '-');
  let singer = obj.singer.replace(/\#/g, '-');
  fs.appendFileSync(__dirname + '/audios.txt', `${href}#${title}#${singer}\n`, {encoding : 'utf8'});
  callback();
}

let loadData = (filename) => {
  return new Promise((r, rj) => {
    let lines = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filename)
    });

    rl.on('line', (line) => {
      let obj = {};
      let p = line.search('#');
      obj.href = line.substring(0, p);
      line = line.substring(p + 1);
      p = line.search('#');
      obj.title = line.substring(0, p);
      obj.singer = line.substring(p + 1);
      lines.push(obj);
    });

    rl.on('close', () => {
      r(lines);
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

let change_alias = (alias) => {
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

let convertReg = (alias) => {
  var str = change_alias(alias);
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
exports.convert = convertReg;
exports.saveData = saveData;
exports.loadData = loadData;
exports.findInLocal = findInLocal;
