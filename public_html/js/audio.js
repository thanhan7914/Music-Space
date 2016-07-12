(function(w) {
  (function(w) {
    var id = {
      attach : function(key, value) {
        if(this.hasOwnProperty(key))
          return false;
        else
        {
          this[key] = null;
          if(typeof value !== 'undefined')
            this[key] = value;
          return true;
        }
      },
      detach : function(key) {
        let value;
        if(this.hasOwnProperty(key))
        {
          value = this[key];
          delete this[key];
        }
        return value;
      }
    };

    w.id = id;
  })(w);
  (function(w){
    let audioCtx = new (w.AudioContext || w.webkitAudioContext)();
    let audioSource, gainNode, analyser, app;
    let pad = function(digit, max, place) {
      if(digit.length >= max) return String(digit);
      if(typeof place === 'undefined') place = ' ';
      digit = String(digit);
      while(digit.length < max)
        digit = place + digit;
      return digit;
    }

    let formatTime = function(time) {return `${pad(Math.round(time / 60), 2, '0')}:${pad(Math.round(time % 60), 2, '0')}`;}

    w.onEnded = function() {
    }

    class App {
      constructor(file, play = true) {
        audioSource = new Audio();
        audioSource.src = file;
        let source = audioCtx.createMediaElementSource(audioSource);
        gainNode = audioCtx.createGain();
        analyser = audioCtx.createAnalyser();
        source.connect(gainNode);
        source.connect(analyser);
        gainNode.connect(audioCtx.destination);
        if(file !== null)
          audioSource.addEventListener("loadeddata", function() {
           if(play)
             audioSource.play();
          });
        audioSource.onended = function() {
          w.onEnded.call(w);
        };
      }

      change() {
        if(audioSource.paused)
        {
          audioSource.play();
          return true;
        }
        else
        {
          audioSource.pause();
          return false;
        }
      }

      paused() {return audioSource.pause};

      seek(time) {
        console.log('seek',time);
        if(time >= 0 && time <= 1)
          audioSource.currentTime = Math.round(time * audioSource.duration);
        else if(time >= 0 && time <= audioSource.duration)
          audioSource.currentTime = time;
      }

      setVol(value) {
        if(value >= 0 && value <= 1)
          gainNode.gain.value = value;
      }

      vollume(value) {
        if(gainNode.gain.value + value >= 0 && gainNode.gain.value + value <= 1)
          gainNode.gain.value += value;
      }

      getAnalyzer() {
        return analyser;
      }

      timeline() {
        return audioSource.currentTime / audioSource.duration;
      }

      loop(l) {
        audioSource.loop = l;
      }

      close() {
        audioSource.removeAttribute('src');
        audioSource.load();
      }

      muteChange() {
        audioSource.muted = !audioSource.muted;
        return audioSource.muted;
      }

      muted() {
        return audioSource.muted;
      }

      calcTime(percent) {
        let time = percent * audioSource.duration;
        return `${formatTime(time)}/${formatTime(audioSource.duration)}`;
      }
    }

    w.createAudioApplication = function(file) {
      if(typeof app !=='undefined')
        app.close();

      app = new App(file);
      return app;
    };
  }(w));
  let WIDTH, HEIGHT;
  let drawVisual;

  let bar = function(canvas, canvasCtx, analyser, smt = 0.3) {
    analyser.smoothingTimeConstant = smt;
    analyser.fftSize = 512;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    var gradient = canvasCtx.createLinearGradient(0, 0, 0, 480);
    gradient.addColorStop(1, '#000000');
    gradient.addColorStop(0.75, '#ff0000');
    gradient.addColorStop(0.25, '#ffff00');
    gradient.addColorStop(0, '#ffffff');

    function draw() {
      drawVisual = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      canvasCtx.fillStyle = gradient;
      let len = dataArray.length;
      let p = dataArray[0];
      for ( var i = 0; i < len; i++ ){
          var value = dataArray[i];

          canvasCtx.fillRect(i*8, 3 * HEIGHT / 4 - value, 5, value);
          canvasCtx.beginPath();
          canvasCtx.moveTo(i*8, 3 * HEIGHT / 4);
          canvasCtx.lineTo(i*8 + 5, 3 * HEIGHT / 4);
          canvasCtx.strokeStyle = '#000';
          canvasCtx.lineWidth = 1;
          canvasCtx.stroke();
          if(p < dataArray[i]) p = dataArray[i];
      }

      let step = 8;
      for(let i = step; i < p; i += step)
        canvasCtx.clearRect(0, 3 * HEIGHT / 4 - i, WIDTH, 1);
    };

    if(typeof drawVisual !== 'undefined')
      cancelAnimationFrame(drawVisual);
    draw();
  }

  let bar2 = function(canvas, canvasCtx, analyser, smt = 0.4) {
    analyser.smoothingTimeConstant = smt;
    analyser.fftSize = 128;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
      drawVisual = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      var barWidth = WIDTH / bufferLength * 1.5;
      var barHeight;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {
        var v = dataArray[i];
        barHeight = v;

        canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ', 50, 50)';
        canvasCtx.fillRect(x, HEIGHT / 2 - barHeight / 2, barWidth, barHeight / 2);
        //line
        canvasCtx.beginPath();
        canvasCtx.moveTo(x, HEIGHT / 2);
        canvasCtx.lineTo(x + barWidth, HEIGHT / 2);
        canvasCtx.strokeStyle = 'rgb( 50, 50, 50)';
        canvasCtx.lineWidth = 1;
        canvasCtx.stroke();
        //under
        canvasCtx.fillStyle = 'rgba(' + (barHeight+100) + ', 50, 50, 0.8)';
        canvasCtx.fillRect(x, HEIGHT / 2, barWidth, barHeight / 2);

        x += barWidth + 4;
      }
    };

    if(typeof drawVisual !== 'undefined')
      cancelAnimationFrame(drawVisual);
    draw();
  }

  let line = function(canvas, canvasCtx, analyser, smt = 0.4) {
    analyser.smoothingTimeConstant = smt;
    analyser.fftSize = 128;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
      drawVisual = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      var barWidth = WIDTH / 50;
      var barHeight;
      var x = 0;

      for(var i = 0; i < 50; i++) {
        barHeight = dataArray[i];

        canvasCtx.beginPath();
        canvasCtx.moveTo(x, HEIGHT / 2 + barHeight / 4 - barHeight / 2);
        canvasCtx.lineTo(barWidth + x -1, HEIGHT / 2 + barHeight / 4 - barHeight / 2);
        canvasCtx.strokeStyle = 'yellow';
        canvasCtx.lineWidth = 1;
        canvasCtx.stroke();

        x += barWidth + 4;
      }
    };

    if(typeof drawVisual !== 'undefined')
      cancelAnimationFrame(drawVisual);
    draw();
  }

  let circle = function(canvas, canvasCtx, analyser, smt = 0.2) {
    let centerY = HEIGHT / 2;
    let centerX = WIDTH / 2;
    analyser.smoothingTimeConstant = smt;
    analyser.fftSize = 128;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
      drawVisual = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      let r;
      let c_end = 20;
      let c_start = 8;

      for(let i = c_start; i < c_end; i++) {
        r = dataArray[i];

        canvasCtx.beginPath();
        canvasCtx.arc(centerX, centerY, r, 0, 2*Math.PI);
        canvasCtx.strokeStyle = '#3498db';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
      }
    };

    if(typeof drawVisual !== 'undefined')
      cancelAnimationFrame(drawVisual);
    draw();
  }

  let sinewave = function(canvas, canvasCtx, analyser, smt = 0.8) {
    analyser.smoothingTimeConstant = smt;
    analyser.fftSize = 2048;
    var bufferLength = analyser.fftSize;
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    function draw() {
      drawVisual = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      //clear
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#f1c40f';

      canvasCtx.beginPath();

      var sliceWidth = WIDTH * 1.0 / bufferLength;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {

        var v = dataArray[i] / 128.0;
        var y = v * HEIGHT/2;

        if(i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(WIDTH, HEIGHT / 2);
      canvasCtx.stroke();
    };

    draw();
  }

  let init = function (canvas) {
    WIDTH = canvas.width;
    HEIGHT = canvas.height;
  }

  let audio = {
    init,
    bar,
    bar2,
    line,
    circle,
    sinewave
  };

  w.audio = audio;
})(window);
