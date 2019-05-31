var mainContainer = document.getElementById('js-main-container'),
    loginContainer = document.getElementById('js-login-container'),
    loginButton = document.getElementById('js-btn-login'),
    background = document.getElementById('js-background');





var scopes = ['user-read-private', 'user-read-email'], state = 'some-state-of-my-choice';





console.log("SCRIPT")

var spotifyPlayer = new SpotifyPlayer({
  exchangeHost: 'http://localhost:3000'
});

console.log(spotifyPlayer)

var template = function (data) {
  return `
    <div class="main-wrapper">
      <img class="now-playing__img" src="${data.item.album.images[0].url}">
      <div class="now-playing__side">
        <div class="now-playing__name">${data.item.name}</div>
        <div class="now-playing__artist">${data.item.artists[0].name}</div>
        <div class="now-playing__status">${data.is_playing ? 'Playing' : 'Paused'}</div>
        <div class="progress">
          <div class="progress__bar" style="width:${data.progress_ms * 100 / data.item.duration_ms}%"></div>
        </div>
      </div>
    </div>
    <div class="background" style="background-image:url(${data.item.album.images[0].url})"></div>
  `;
};

spotifyPlayer.on('update', response => {
  mainContainer.innerHTML = template(response);
});

spotifyPlayer.on('login', user => {
  if (user === null) {
    loginContainer.style.display = 'block';
    mainContainer.style.display = 'none';
  } else {
    loginContainer.style.display = 'none';
    mainContainer.style.display = 'block';
  }
});

loginButton.addEventListener('click', () => {
    console.log('click');
    const url = 'https://accounts.spotify.com/authorize';
    var scope = 'user-read-private', state = 'some-state-of-my-choice';
    const w = window.open(
      url + 
      '?response_type=code' +
      '&client_id=' + process.env.CLIENT_ID +
      '&scope=' + encodeURIComponent(scope) +
      '&redirect_uri=' + encodeURIComponent(process.env.REDIRECT_URI)
    )
    

});
