const express = require('express');
const app = express();
const path = require('path');

const hostname = 'localhost';
const port = 3000;

var DEV = process.env.DEV ? true : false;
console.log('DEV', DEV)
var stateKey = 'spotify_auth_state';

var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var redirect_uri = process.env.REDIRECT_URI;
console.log ('redirect_uri', redirect_uri)

app.get('/', function(request, response){
    response.sendFile(__dirname + '/index.html');

});

app.get('/script.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/script.js'));
});

app.get('/spotify-player.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/spotify-player.js'));
});

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-playback-state';
  res.redirect('https://accounts.spotify.com/authorize' +
  	'?response_type=code' +
  	'&client_id=' + client_id +
  	'&scope=' + encodeURIComponent(scope) +
  	'&redirect_uri=' + encodeURIComponent(redirect_uri));
  	/*
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
    */
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    console.log('state mismatch', 'state: ' + state, 'storedState ' + storedState, 'cookies ', req.cookies);
    res.render('pages/callback', {
      access_token: null,
      expires_in: null
    });
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },	
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token,
            expires_in = body.expires_in;

        console.log('everything is fine');
        res.cookie('refresh_token', refresh_token, {maxAge: 30 * 24 * 3600 * 1000, domain: 'localhost'});

        res.render('views/callback', {
          access_token: access_token,
          expires_in: expires_in,
          refresh_token: refresh_token
        });
      } else {
        console.log('wrong token');

        res.render('views/callback', {
          access_token: null,
          expires_in: null
        });
      }
    });
  }
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

