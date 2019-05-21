const express = require('express');
const app = express();
const path = require('path');

const hostname = 'localhost';
const port = 3000;

app.get('/', function(request, response){
    response.sendFile(__dirname + '/index.html');

});

app.get('/script.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/script.js'));
});

app.get('/spotify-player.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/spotify-player.js'));
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

