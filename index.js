var express = require('express');
var app = express();
var server = require('http').createServer(app);
var port = process.env.PORT || 3000;

server.listen(port, function() {
	console.log('server listening at port ' + port);
});

app.use(express.static(__dirname + '/public'));

app.get('/*', function(req, res){
	// console.dir(req.path);
	res.redirect('/');
});