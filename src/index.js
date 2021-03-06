var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

require('dotenv').config()

const { google } = require('googleapis');
const googleAuth = require("../authentication");

var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your secret
var redirect_uri = process.env.REDIRECT_URI; // Your redirect uri

const recentlyPlayedTracks = [];
const tracksFromSpotAPI = [];

var stateKey = 'spotify_auth_state';

var app = express();

function wasAppended(err, res) {
  console.log('wasAppended')
  if (err) {
    console.log('The API returned an error: ' + err);
    return;
  } else {
      console.log("Appended");
  }
}

function writeToSheets(err, res) {
  console.log('writeToSheets')
  if(err) {
    console.log('The API returned an error: ' + err);
    return;
  }
  const startingRow = res.data.values.length + 1;
  const sheets = google.sheets('v4');
  const range = `Sheet1!A${startingRow.toString()}:B${startingRow.toString()}`
  sheets.spreadsheets.values.append({
    auth: auth,
    spreadsheetId: '1U7hzwjDcz80xN7PlrycszooWmMs1tKDkCS_TEUzxi6A',
    range: range, //Change Sheet1 if your worksheet's name is something else
    valueInputOption: "USER_ENTERED",
    resource: {
      values: tracks
    }
  }, wasAppended)
}

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = (function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  })(16);

  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-read-recently-played';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter


  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
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
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

function getData(auth) {
  const sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
    auth: auth,
    spreadsheetId: '1U7hzwjDcz80xN7PlrycszooWmMs1tKDkCS_TEUzxi6A',
    range: 'Sheet1!A:D', //Change Sheet1 if your worksheet's name is something else
  },(err, response) => {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var rows = response.data.values;
    console.log('&*(', rows.length + 1)
    return rows.length + 1;

    /*
    if (rows.length === 1) {
      console.log('No data found.');
    } else {
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        console.log(row.join(", "));
      }
    }
    */
  });
}

app.get('/reclisthist', function(req, res) {

    var authOptions = {
    	url: 'https://api.spotify.com/v1/me/player/recently-played',
    	headers: { 'Authorization': 'Bearer ' + req.query.accessToken },
	};

  request.get(authOptions, function(error, response, body) {

    const myObject = JSON.parse(body);
    let artistNames = "";
  	for(let i = 0; i < myObject.items.length; i++) {
  		for(let j = 0; j < myObject.items[i].track.artists.length; j++) {
  			artistNames += myObject.items[i].track.artists[j].name;
  			if(j !== myObject.items[i].track.artists.length - 1) {
  				artistNames += ', '
  			}
  		}

  		recentlyPlayedTracks.push({
  			trackName: myObject.items[i].track.name,
  			artistNames: artistNames,
  			albumName: myObject.items[i].track.album.name,
  			playedAt: myObject.items[i].played_at
  		})
      tracksFromSpotAPI.push([myObject.items[i].track.name, artistNames, myObject.items[i].track.album.name, myObject.items[i].played_at]);
  		artistNames = "";
  	}
    
    googleAuth.authenticate()
    .then(auth => { 
      const sheets = google.sheets('v4');
      sheets.spreadsheets.values.get({
        auth: auth,
        spreadsheetId: '1U7hzwjDcz80xN7PlrycszooWmMs1tKDkCS_TEUzxi6A',
        range: 'Sheet1!A:D', //Change Sheet1 if your worksheet's name is something else
      },(err, response) => {
        if (err) {
          console.log('The API returned an error: ' + err);
          return;
        }
        console.log('^^^', response.data)
        console.log('%%%', tracksFromSpotAPI)

        function arraysEqual(arr1, arr2) {
          console.log('arraysEqual')
          if(arr1.length !== arr2.length)
              return false;
          for(var i = arr1.length; i--;) {
              if(arr1[i] !== arr2[i])
                  return false;
          }
          return true;
        }

        function compareTracks(arrone, arrtwo) {
          console.log('compareTracks', arrone, arrtwo)
          const result = [];
          for(let i = 0; i < arrone.length; i++) {
            console.log(i)
            for(let j = 0; j < arrtwo.length; j++) {
              if(arraysEqual(arrone[i], arrtwo[j])) {
                result.push(i);
              }
            }
          }
          console.log('compareTracks result', result)
          return result;
        }

        const idxsToRem = compareTracks(tracksFromSpotAPI, response.data.values).reverse();
        console.log('#1', idxsToRem)
        for(let i = 0; i < idxsToRem.length; i++) {
          tracksFromSpotAPI.splice(idxsToRem[i], 1);
        }
        console.log('#2', tracksFromSpotAPI)

        const startingRow = response.data.values.length + 1;
        const sheets = google.sheets('v4');
        const range = `Sheet1!A${startingRow.toString()}:B${startingRow.toString()}`
        sheets.spreadsheets.values.append({
          auth: auth,
          spreadsheetId: '1U7hzwjDcz80xN7PlrycszooWmMs1tKDkCS_TEUzxi6A',
          range: range, //Change Sheet1 if your worksheet's name is something else
          valueInputOption: "USER_ENTERED",
          resource: {
            values: tracksFromSpotAPI
          }
        }, (err, response) => {
          if (err) {
            console.log('The API returned an error: ' + err);
            return;
          } else {
              console.log("Appended");
          }
        })
      })
    })




    if (!error && response.statusCode === 200) {
      res.send({
      	'access_token': req.query.accessToken,
      	'recently_played_tracks': recentlyPlayedTracks
      });
    }
  });
  
});

console.log('Listening on 3000');
app.listen(3000);