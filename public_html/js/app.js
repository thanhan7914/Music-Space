let app, analyser;
let canvas = document.querySelector('#visualizer');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
audio.init(canvas);
let canvasCtx = canvas.getContext("2d");
let folder = 'assets/audios';
let ext = 'mp3';
let list = [{href : 'Mylove.mp3', title : 'My love', singer: 'Westlife'}, {href : 'NothingGonnaChangeMyLoveForYou.mp3', title : 'Nothing Gonna Change My Love For You', singer : 'Westlife'}, {href : 'CarelessWhisper.mp3', title : 'Careless Whisper', singer :'Wham HQ'}];
let history = [];
id.attach('pos', 0);

function load(datas) {
  if(typeof datas === 'undefined' || !datas) return;

  if(history.filter(function(obj) {
    let ohref = obj.href;
    let dhref = datas.href;
    if(!ohref.endsWith('.mp3')) ohref = obj.href.substring(obj.href.lastIndexOf('/') + 1, obj.href.lastIndexOf('.')) + '.mp3';
    if(!dhref.endsWith('.mp3')) dhref = datas.href.substring(datas.href.lastIndexOf('/') + 1, datas.href.lastIndexOf('.')) + '.mp3';
    if(ohref === dhref) return true;
    return false;
  }).length === 0) history.push(datas);

  if(!datas.href.endsWith('.mp3'))
  {
    if(typeof $ === 'function') $('.dim').show();
    let fn = function() {
      if(typeof window.playMusic === 'function')
        window.playMusic(datas.href, datas.title, datas.singer);
      else
        setTimeout(fn, 100);
    }

    fn();
    app = createAudioApplication(null);
    analyser = app.getAnalyzer();
    return;
  }

  app = createAudioApplication(`${folder}/${datas.href}`);
  app.setVol(id.vol);
  analyser = app.getAnalyzer();
  visualize(typeof id.typeVisualizer !== 'undefined' ? id.typeVisualizer : 4);
  let update = function() {
    $(document).ready(function() {
      let percent = app.timeline();
      $('#time').css('width', percent * 100 + '%');
      setTimeout(update, 1000);
    });
  };
  update();
  window.audioProgress = function(bf, time, duration) {
    let range = 0;
    while(!(bf.start(range) <= time && time <= bf.end(range))) {
        range += 1;
    }

    let loadStartPercentage = bf.start(range) / duration;
    let loadEndPercentage = bf.end(range) / duration;
    let loadPercentage = loadEndPercentage - loadStartPercentage;
    let w = loadPercentage * 188;
    $('.audio-loaded').css({'top' : $('.dim-duration').offset().top + 'px', 'left' : $('.dim-duration').offset().left + 'px', 'width': w + 'px'});
  };

  document.querySelector('#song-title').innerHTML = datas.title.length > 15 ? datas.title.substring(0, 12) + '...' : datas.title;
  document.querySelector('#singer').innerHTML = datas.singer.length > 15 ? datas.singer.substring(0,14) + '...' : datas.singer;
  document.querySelector('#playpause>i').className = 'fa fa-2x fa-pause';
}

function visualize(type) {
  switch (type) {
    case 0:
      audio.bar(canvas, canvasCtx, analyser);
      break;
    case 1:
      audio.bar2(canvas, canvasCtx, analyser);
      break;
    case 2:
      audio.line(canvas, canvasCtx, analyser);
      break;
    case 3:
      audio.circle(canvas, canvasCtx, analyser);
      break;
    case 4:
      audio.sinewave(canvas, canvasCtx, analyser);
      break;
  }
}

if(typeof String.prototype.addslashes === 'undefined')
  String.prototype.addslashes = function() {
    return this.replace(/\'/g,'\\\'').replace(/\"/g,'\\\"');
  }

let listen_element = document.getElementsByTagName('listen');
if(listen_element.length > 0)
{
  list = [];
  list.push(JSON.parse(`${listen_element[0].textContent}`));
  id.pos = 0;
  load(list[id.pos]);
  app.setVol(0.5);
}

//load(list[id.pos]);
//app.setVol(0.5);
list = [];

audioEnded = function() {
  id.pos++;
  if(id.pos >= list.length) id.pos = 0;
  load(list[id.pos]);
}

$(document).ready(function() {
  //resize
  if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 400)
    $('head').append('<link rel="stylesheet" type="text/css" href="assets/css/app.mobi.css">');

  $('.audio-loaded').css({'top' : $('.dim-duration').offset().top + 'px', 'left' : $('.dim-duration').offset().left + 'px', 'width': '0px'});

  id.attach('soundClass', 'fa fa-2x fa-volume-down');
  id.attach('typeVisualizer', 4);
  id.attach('mdelay', 200);
  id.attach('tmark', 0);

  $('#playpause').click(function() {
    let play = app.change();
    if(play)
      document.querySelector('#playpause>i').className = 'fa fa-2x fa-pause';
    else
      document.querySelector('#playpause>i').className = 'fa fa-2x fa-play';
  });

  $('#sound').click(function() {
    let muted = app.muteChange();
    if(!muted)
      document.querySelector('#sound>i').className = id.soundClass;
    else
      document.querySelector('#sound>i').className = 'fa fa-2x fa-volume-off';
  });

  $('#rangeSound').change(function() {
    let vol = $(this).val() / 100;
    if(vol > 0.9) id.soundClass = 'fa fa-2x fa-volume-up';
    else if(vol < 0.1) id.soundClass = 'fa fa-2x fa-volume-off';
    else id.soundClass = 'fa fa-2x fa-volume-down';
    if(!app.muted())
      document.querySelector('#sound>i').className = id.soundClass;
    id.attach('vol');
    id.vol = vol;
    app.setVol(vol);
  });

  $('#effect').change(function() {
    let selected = parseInt($(this).val());
    id.typeVisualizer = selected;
    visualize(selected);
  });

  $('.dim-duration').mouseenter(function(e) {
    $('.dim-duration').find('.seek').show();
    $(this).find('span').show();
//    $('.dim-duration').find('.line-tooltip').show();
  });

  $('.dim-duration').mousemove(function(e) {
    let tooltip = $(this).find('span').text(app.calcTime(e.offsetX / $(this).width()));
    let line = $('.dim-duration').find('.line-tooltip');
    let x = e.clientX - 26,
       y = e.clientY - 15;
    tooltip.css({'top' : y + 'px', 'left' : x + 'px', 'display': 'block'});
    line.css({'top' : $(this).offset().top + 'px', 'left' : (x + 26) + 'px', 'display': 'block'});
    if(Date.now() - id.tmark < id.mdelay) return;
    id.tmark = Date.now();
    let w = $(this).width(),
        h = $(this).height();
    let p = (e.clientX - $(this).offset().left) / w;
    $('#seek-info').show().text('seek ' + (p * 100) + '%');
  });

  $('.dim-duration').click(function(e) {
    let w = $(this).innerWidth();
    let percent = (e.clientX - $(this).offset().left) / w;
    app.seek(percent);
    $('#seek-info').show().text('seek ' + (percent * 100) + '%');
    $('#time').css('width', percent * 100 + '%');
  });

  $('.dim-duration').mouseout(function() {
    $('#seek-info').hide();
    $(this).find('span').hide();
    $('.dim-duration').find('.line-tooltip').hide();
  });

  $('#seek-info').hide();

  $('#prev').click(function() {
    id.pos--;
    if(id.pos < 0) id.pos = list.length - 1;
    load(list[id.pos]);
  });

  $('#next').click(function() {
    id.pos++;
    if(id.pos >= list.length) id.pos = 0;
    load(list[id.pos]);
  });

  let fnio = io.bind(null);
  io = function() {};
  let socket = fnio();
  id.attach('sdelay', 400);
  id.attach('smark');
  id.attach('ssto');
  id.attach('newfind', true);

  socket.on('found-out', function(datas) {
    document.querySelector('.search > i').className = 'fa fa-2x fa-search';
    datas = Array.prototype.slice.call(datas);
    let container = $('#result');
    if(id.newfind) container.empty();
    else container.find('#more').remove();
    let detail = datas.shift();
    container.attr({'items': detail.items, 'total': detail.total, 'last': detail.last, 'keyword': $('#search').attr('keyword')});
    for(let i of datas)
    {
      let color = inPlayList(i) ? '#d35400' : '#fff';
      let star = $(`<i class="fa fa-star mark" aria-hidden="true" style="color: ${color};position: relative;left: 0;font-size: 19px;z-index: 10; display: inline;" title="add/remove to playlist" datas="{'href' : '${i.href}', 'title' : '${i.title.addslashes()}', 'singer' : '${i.singer.addslashes()}'}"></i>`);
      let li = $('<li></li>').html(`
        <div class="result-content" style="display: inline;" onclick="playMusic('${i.href}', '${i.title.addslashes()}', '${i.singer.addslashes()}');">
          <p class="title">${i.title.substring(0, 20) + (i.title.length > 20 ? '...' : '')}</p>
          <p class="singer">${i.singer}</p>
        </div>
        `);
        li.prepend(star);
        container.append(li);
        star.click(function(){
          let color = $(this).css('color');
          if(color === 'rgb(211, 84, 0)') color = '#fff';
          else color = '#d35400';

          $(this).css('color', color);
          let datas = String($(this).attr('datas'));
          datas = datas.replace(/\'/g, '\"');
          datas = JSON.parse(datas);
          addPlayList(datas);
        })
    }

    if(detail.last < detail.total)
      container.append(`
        <li id="more">${detail.last + detail.items}/${detail.total} results<br><i class="fa fa-ellipsis-h" aria-hidden="true" style="font-size: 24px;"></i></li>
        `);

    $('#result').scroll(function() {
      let more = $('#more');
      if(!more || typeof more.offset === 'undefined') return;
      if(more.offset().top > innerHeight) return;
      more.find('i').removeClass('fa-ellipsis-h').addClass('fa-refresh fa-spin fa-3x fa-fw');
      id.newfind = false;
      socket.emit('find', $('#search').attr('keyword'), detail.last + detail.items);
    });
  });

  socket.on('play', function(datas) {
    $('.dim').fadeOut('slow');
    $('.warning').fadeOut('slow');
    if(datas.hasOwnProperty('type') && !datas.type) list.push(datas);
    load(datas);
  });

  socket.on('tomanyrequest', function() {
    console.log('tomanyrequest');
    $('.dim').fadeOut('slow');
    $('.warning').fadeOut('slow');
  });

  socket.on('msg', function(msg) {
    console.log(msg);
    $('.dim').fadeOut('slow');
    $('.warning').fadeOut('slow');
  });

  socket.on('fileExists', function(un) {
    un = Boolean(un);
    console.log(un);
  });

  socket.on('lyrics', function(context) {
    console.log(context);
  });

  $('#search').keyup(function(e) {
    if(typeof id.ssto !== 'undefined')
      clearTimeout(id.ssto);
    document.querySelector('.search > i').className = 'fa fa-refresh fa-spin fa-2x fa-fw';
    if(Date.now() - id.smark < id.sdelay)
    {
      if($('#search').val().length > 3)
        id.ssto = setTimeout(function() {
          $('#search').attr('keyword', $('#search').val());
          id.newfind = true;
          socket.emit('find', $('#search').val());
        }, id.sdelay);
      return;
    }
    id.smark = Date.now();

    if($(this).val() < 3) return;
    id.newfind = true;
    $('#search').attr('keyword', $('#search').val());
    socket.emit('find', $('#search').val());
  });

  $('#search').blur(function() {
    $('#result').slideUp('slow');
  });

  $('#search').focus(function() {
    $('#result').slideDown('slow');
  });

  $('#history, #list').click(function() {
    $('.dim').show();
    $('.close').show();
    $('#list-cover').show();
  });

  $('#list').click(function() {
    let container = $('#list-spread');
    $('#list-cover').find('h1').text('Danh sách bài hát');
    container.empty();
    let c = 0;
    for(let i of list)
    {
      let color = inPlayList(i) ? '#d35400' : '#fff';
      let ele =  `
        <li>
          <i class="fa fa-star" aria-hidden="true" style="color: ${color};position: relative;left: 0;font-size: 24px;z-index: 10; display: inline; margin: 24px 16px;" title="add/remove to playlist" datas="{'href' : '${i.href}', 'title' : '${i.title.addslashes()}', 'singer' : '${i.singer.addslashes()}'}"></i>
          <div style="display: inline" onclick="javascript:$('.dim').hide(); $('.close').hide(); $('#list-cover').hide(); playMusic('${i.href}', '${i.title.addslashes()}', '${i.singer.addslashes()}', ${c});">
             ${i === list[id.pos] ? '<i class="fa fa-hand-o-right" aria-hidden="true"></i>' : ''} ${i.title} - ${i.singer}
          </div>
        </li>
        `;
      container.append.call(container, ele);
      c++;
    }

    container.append(`<li onclick="(function() {
      list = [];
      $('#list-spread').empty();
      $('#list-spread').append('<h3>(Empty)</h3>');
    }());">remove all playlist</li>`);

    $('#list-spread > li >i').click(function() {
      let color = $(this).css('color');
      if(color === 'rgb(211, 84, 0)') color = '#fff';
      else color = '#d35400';

      $(this).css('color', color);
      let datas = String($(this).attr('datas'));
      datas = datas.replace(/\'/g, '\"');
      datas = JSON.parse(datas);
      addPlayList(datas);
      return false;
    });
  });

  $('#history').click(function() {
    let container = $('#list-spread');
    $('#list-cover').find('h1').text('Bài hát đã phát');
    container.empty();
    for(let i of history)
    {
      let color = inPlayList(i) ? '#d35400' : '#fff';
      let ele =  `
        <li>
          <i class="fa fa-star" aria-hidden="true" style="color: ${color};position: relative;left: 0;font-size: 24px;z-index: 10; display: inline; margin: 24px 16px;" title="add/remove to playlist" datas="{'href' : '${i.href}', 'title' : '${i.title.addslashes()}', 'singer' : '${i.singer.addslashes()}'}"></i>
          <div style="display: inline" onclick="javascript:$('.dim').hide(); $('.close').hide(); $('#list-cover').hide(); playMusic('${i.href}', '${i.title.addslashes()}', '${i.singer.addslashes()}');">
            ${i === list[id.pos] ? '<i class="fa fa-hand-o-right" aria-hidden="true"></i>' : ''} ${i.title} - ${i.singer}
          </div>
        </li>
        `;
      container.append.call(container, ele);
    }

    $('#list-spread > li >i').click(function() {
      let color = $(this).css('color');
      if(color === 'rgb(211, 84, 0)') color = '#fff';
      else color = '#d35400';

      $(this).css('color', color);
      let datas = String($(this).attr('datas'));
      datas = datas.replace(/\'/g, '\"');
      datas = JSON.parse(datas);
      addPlayList(datas);
      return false;
    });
  });

  $(window).resize(function() {
    $('.audio-loaded').css({'top' : $('.dim-duration').offset().top + 'px', 'left' : $('.dim-duration').offset().left + 'px'});
  });

  window.playMusic = function(href, title, singer, c) {
    setTimeout(function() {
      socket.emit('play', {href, title, singer});
    }, 400);
    $('#search').val('');
    $('#result').empty();
    $('.dim').fadeIn('slow');
    $('.warning').fadeIn('slow');
    if(typeof c !== 'undefined') id.pos = c;
  }

  window.addPlayList = function(datas) {
    if(!inPlayList(datas)) list.push(datas);
    else list = list.filter(function(obj) {
      if(datas.href === obj.href) return false;
      return true;
    });
  }

  window.inPlayList = function(datas) {
    return (list.filter(function(obj) {
      let ohref = obj.href;
      let dhref = datas.href;
      if(!ohref.endsWith('.mp3')) ohref = obj.href.substring(obj.href.lastIndexOf('/') + 1, obj.href.lastIndexOf('.')) + '.mp3';
      if(!dhref.endsWith('.mp3')) dhref = datas.href.substring(datas.href.lastIndexOf('/') + 1, datas.href.lastIndexOf('.')) + '.mp3';
      if(ohref === dhref) return true;
      return false;
    }).length !== 0);
  }

  /*link https://developer.mozilla.org/en-US/Apps/Fundamentals/Audio_and_video_delivery/cross_browser_video_player#Fullscreen*/
  window.setFullscreenData = function(state, container) {
    if(container && typeof container.setAttribute === 'function')
      container.setAttribute('data-fullscreen', !!state);
  }

  window.handleFullscreen =function() {
    let isFullScreen = function() {
      return !!(document.fullScreen || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement || document.fullscreenElement);
    }

    let container = document.querySelector('html');

    if (isFullScreen()) {
       if (document.exitFullscreen) document.exitFullscreen();
       else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
       else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
       else if (document.msExitFullscreen) document.msExitFullscreen();
       setFullscreenData(container, false);
       document.querySelector('#fs>i').className = 'fa fa-2x fa-expand';
    }
    else {
       if (container.requestFullscreen) container.requestFullscreen();
       else if (container.mozRequestFullScreen) container.mozRequestFullScreen();
       else if (container.webkitRequestFullScreen) container.webkitRequestFullScreen();
       else if (container.msRequestFullscreen) container.msRequestFullscreen();
       setFullscreenData(container, true);
       document.querySelector('#fs>i').className = 'fa fa-2x fa-compress';
    }
  }

  document.addEventListener('fullscreenchange', function(e) {
    setFullscreenData(!!(document.fullScreen || document.fullscreenElement));
  });

  document.addEventListener('webkitfullscreenchange', function() {
    setFullscreenData(!!document.webkitIsFullScreen);
  });

  document.addEventListener('mozfullscreenchange', function() {
    setFullscreenData(!!document.mozFullScreen);
  });

  document.addEventListener('msfullscreenchange', function() {
    setFullscreenData(!!document.msFullscreenElement);
  });
});
