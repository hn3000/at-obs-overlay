
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

type MsgHandler = (msg: any) => void;

let clients = [] as MsgHandler[];

function addClient(c: MsgHandler) {
  clients = [c].concat(clients);
  console.info(`added client, now got ${clients.length}`);

  return () => removeClient(c);
}
function removeClient(c: MsgHandler) {
  clients = clients.filter(x => x !== c);
  console.info(`removed client, now got ${clients.length}`);
}


let websocket = null as WebSocket;
let connected = null as WebSocket;

let msgCount = 0;
let lastCount = 0;
let last = Date.now();

let stopFlag = false;

ws_connect();

let wasInSong = true;
let count = 0;
addClient(msgStr => {
  const now = Date.now();
  ++count;
  const msg = JSON.parse(msgStr);
  if (msg.inSong || wasInSong) {
    wasInSong = msg.inSong;
    console.log(JSON.stringify({ now, count, msg}));
  } else {
    if ((now - last) > 20000 && lastCount !== count) {
      //console.log(`messages: ${msgCount}`);
      console.log(JSON.stringify({ now, count, msg}));
      lastCount = count;
      last = now;
    }
  }
})

function ws_connect() {
  const wsl = new WebSocket(WS_URL);
  console.log(`connecting to ${WS_URL}`);
  wsl.on('open', () => {
    console.log('game: connection.');
    connected = wsl;
  })
  wsl.on('message', (msg) => {
    if (msg != null) {
      msgCount++;

      const errorHandler = (err, c) => {
        if (err) {
          console.log('error sending', err);
          removeClient(c);  
        }
      }
    
      clients.forEach(c => {
        try {
          c(msg);
        } catch (err) {
          errorHandler(err, c);
        }
      });
    }
  });
  wsl.on('close', (ev) => {
    if (wsl === websocket) {
      if (!stopFlag) {
        setTimeout(() => ws_connect(), 1500);
      }
      websocket.terminate();
      websocket = null;
    }
    console.log('game: close', ev);
  });
  wsl.on('error', (err) => {
    if (wsl === websocket) {
      if (!stopFlag) {
        setTimeout(() => ws_connect(), 1500);
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
