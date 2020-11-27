const http = require('http');
const app = require('express')();
app.listen(8081, () => console.log('listening on http port 8081'));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const websocketServer = require('websocket').server;
const httpServer = http.createServer();

httpServer.listen(8080, () => console.log('Listening on port 8080...'));

//hashmap
const clients = {};
const games = {};

const wsServer = new websocketServer({
  httpServer: httpServer
});

wsServer.on('request', (request) => {
  // connect
  const connection = request.accept(null, request.origin);

  connection.on('open', () => console.log('opened!'));
  connection.on('close', () => console.log('closed!'));
  connection.on('message', (message) => {
    // receiving a message from the client
    const result = JSON.parse(message.utf8Data);

    // if user wants to create a new game
    if (result.method === 'create') {
      const clientId = result.clientId;
      const gameId = guid();
      games[gameId] = {
        id: gameId,
        tiles: 20,
        clients: []
      };

      const payLoad = {
        method: 'create',
        game: games[gameId]
      };

      const con = clients[clientId].connection;
      con.send(JSON.stringify(payLoad));
    }

    // if a user wants to join a game
    if (result.method === 'join') {
      const clientId = result.clientId;
      const gameId = result.gameId;
      const game = games[gameId];
      if (game.clients.length >= 3) {
        {
          // max players reached
          return;
        }
      }
      const color = { 0: 'Red', 1: 'Green', 2: 'Blue' }[game.clients.length];
      game.clients.push({
        clientId,
        color
      });

      if (game.clients.length === 3) updateGameState();

      const payLoad = {
        method: 'join',
        game
      };
      // loop through all clients to let them know a new player has joined
      game.clients.forEach((client) => {
        clients[client.clientId].connection.send(JSON.stringify(payLoad));
      });
    }

    // user makes a play
    if (result.method === 'play') {
      const gameId = result.gameId;
      const tileId = result.tileId;
      const color = result.color;
      let state = games[gameId].state;

      if (!state) state = {};

      state[tileId] = color;
      games[gameId].state = state;
    }
  });

  // generate a new clientID
  const clientId = guid();
  clients[clientId] = {
    connection: connection
  };

  const payLoad = {
    method: 'connect',
    clientId
  };

  // send back the client connect
  connection.send(JSON.stringify(payLoad));
});

// update game state, runs every 500 ms
const updateGameState = () => {
  for (const g of Object.keys(games)) {
    const game = games[g];
    const payLoad = {
      method: 'update',
      game
    };
    game.clients.forEach((client) => {
      clients[client.clientId].connection.send(JSON.stringify(payLoad));
    });
  }

  setTimeout(updateGameState, 500);
};

function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// then to call it, plus stitch in '4' in the third group
const guid = () =>
  (
    S4() +
    S4() +
    '-' +
    S4() +
    '-4' +
    S4().substr(0, 3) +
    '-' +
    S4() +
    '-' +
    S4() +
    S4() +
    S4()
  ).toLowerCase();
