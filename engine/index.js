'user strict';

let fs = require('fs');
let path = require('path');
let _ = require('lodash');

exports.cache = {};

let readFile = function(fileName, options)
{
  if(exports.cache[fileName]) return exports.compile(exports.cache[fileName], options);
  let str = fs.readFileSync(fileName, 'utf8');
  //edit
  let templ = exports.compile(str, options);
//  exports.cache[fileName] = str; //cover to design ui
  return templ;
}

exports.compile = function(str, options)
{
  if(typeof options === 'object')
  {
    for(let key in options)
    {
      if(!options.hasOwnProperty(key) || typeof options[key] === 'object' || _.startsWith(String(key), '__')) continue;

      let reg = new RegExp('<eng data=' + String(key) + '>','g');
      str = str.replace(reg, options[key]);
    }
  }
  else
  {
    for(let idx of options)
    {
      let key = options[idx];
      let reg = new RegExp('<eng data=' + key + '>','g');
      str = str.replace(reg, key);
    }
  }

  return str;
}

exports.renderFile = function(fileName, options, callback)
{
  let templ = readFile(fileName, options);
  return callback(null, templ);
}

exports.__engine__ = function(filePath, options, callback)
{
  return exports.renderFile(filePath, options, callback);
}
