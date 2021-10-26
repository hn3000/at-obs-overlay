
/**
 * A Proxy Server to distribute Audio Trip Play Status info to multiple
 * clients.
 * 
 * Note: Currently kills Audio Trip's WebSocket server on exit.
 * Note2: default Audio Trip server is hardcoded below, 
 * use env var `AT_STATUS_SOCKET` to override, e.g. like this
 * 
 * in bash
 * ```bash
 * AT_STATUS_SOCKET=192.168.2.1 npm run proxy
 * ```
 * 
 * in Windows CMD
 * ```cmd
 * set AT_STATUS_SOCKET=192.168.2.1
 * npm run proxy
 * ```
 * (I think, not tested. Send a PR if it doesn't work. Thanks!)
 * 
 */

import express from 'express';
import * as http from 'http';

import WebSocket from 'ws';

const DEFAULT_STATUS_SOCKET = '127.0.0.1:48998';
const address = process.env['AT_STATUS_SOCKET'] ?? DEFAULT_STATUS_SOCKET;
let WS_URL = `ws://${address}/websocket`;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = [] as WebSocket[];

function addClient(ws: WebSocket) {
  clients = [ws].concat(clients);
  console.info(`added client, now got ${clients.length}`);
}
function removeClient(ws: WebSocket) {
  clients = clients.filter(x => x !== ws);
  console.info(`removed client, now got ${clients.length}`);
}

wss.on('connection', (ws) => {
  addClient(ws);
  const id = clients.length;
  ws.on('message', msg => console.log(msg));
  ws.on('closed', () => {
    removeClient(ws);
    console.log(`websocket closed, ${id}`);
  });
  ws.on('error', (err) => {
    removeClient(ws);
    console.log('websocket error', err);
  });
  ws.send(JSON.stringify({
    "gameVersion": "proxy",
    "inSong": false,
    "proxyClientId": id
  }));
});

let websocket = null as WebSocket;
let connected = null as WebSocket;

let msgCount = 0;
let lastCount = 0;
let last = Date.now();

let port = 48998;

if (address === DEFAULT_STATUS_SOCKET) {
  port = 48999;
  console.warn(`running on port ${port} to avoid conflict, make sure to configure your client`);
}

server.listen(port, '0.0.0.0', 10, () => {
  console.log(`listening `, server.address());
  wsconnect();
});

let stopFlag = false;

function wsconnect() {
  const wsl = new WebSocket(WS_URL);
  console.log(`connecting to ${WS_URL}`);
  wsl.on('open', () => {
    console.log('game: connection.');
    connected = wsl;
  })
  wsl.on('message', (msg) => {
    if (msg != null) {
      msgCount++;

      const errorHandler = (err,ws) => {
        if (err) {
          console.log('error sending', err);
          removeClient(ws);  
        }
      }
    
      clients.forEach(ws => {
        try {
          ws.send(msg, {}, err => errorHandler(err, ws));
        } catch (err) {
          errorHandler(err, ws);
        }
      });
    }
    if ((Date.now() - last) > 2000 && lastCount !== msgCount) {
      console.log(`messages: ${msgCount}`);
      last = Date.now();
      lastCount = msgCount;
    }
  });
  wsl.on('close', (ev) => {
    if (wsl === websocket) {
      if (!stopFlag) {
        setTimeout(() => wsconnect(), 1500);
      }
      websocket.terminate();
      websocket = null;
    }
    console.log('game: close', ev);
  });
  wsl.on('error', (err) => {
    if (wsl === websocket) {
      if (!stopFlag) {
        setTimeout(() => wsconnect(), 1500);
      }
      websocket.terminate();
      websocket = null;
    }
    console.log('error', err);
  });

  websocket = wsl;
}

let stopAgain = false;
process.on('SIGINT', () => {
  if (null != connected && !stopFlag) {
    const stop = () => {
      process.exit();
    };
    websocket.on('end', stop);
    websocket.on('error', stop);
    websocket.on('close', stop);
    stopFlag = true;
    websocket.close();
  } else if (stopFlag && !stopAgain) {
    console.log('press Ctrl-C one more time to force stop');
    stopAgain = true
  } else {
    process.exit();
  }
});
