$(document).ready(function() {
	let socket = id.socket;
	socket.on('lyrics', function(content) {
		console.log(content);
	});

	id.attach('lyrics', function(datas) {
	    socket.emit('lyrics', datas);
	    console.log('ssss');
    });
});