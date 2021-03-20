const express = require('express');
const bodyParser = require('body-parser');
const Pusher = require('pusher');
const app = express();

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create an instance of Pusher
const pusher = new Pusher({
  appId: '1174766',
  key: '163ec128c58785665149',
  secret: '549f899855192c2e463e',
  cluster: 'ap1',
  encrypted: true
});

app.get('/', (req, res) => {
    return res.sendFile(__dirname + '/index.html');
});

// get authentication for the channel;
app.post('/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const presenceData = {
    user_id: Math.random().toString(36).slice(2) + Date.now()
  }
  const auth = pusher.authenticate(socketId, channel, presenceData);
  res.send(auth);
});

//listen on the app
app.listen(8888, () => {
  return console.log('Server is up on 8888')
});
