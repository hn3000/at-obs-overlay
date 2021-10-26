/**
 * A Test Server to test clients for the Audio Trip Play Status info to multiple
 * clients.
 * 
 * Note: This thing runs on 127.0.0.1:48998, so can't run at the same time
 * as Audio Trip's built-in server. Obv. not a concern if your not playing 
 * on the same machine that you're running this on.
 */


import express from 'express';
import * as http from 'http';

import WebSocket from 'ws';

import { IStatsServerSongInfo, StatsServerPayload } from '@hn3000/ats-types';

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let clients = [] as WebSocket[];

function addClient(ws: WebSocket) {
  if (!clients.includes(ws)) {
    clients = [ws].concat(clients);
    console.info(`added client, now got ${clients.length}`);
  } else {
    console.info(`tried to add client again, ignored`);
  }
}
function removeClient(ws: WebSocket) {
  let oldCount = clients.length;
  clients = clients.filter(x => x !== ws);
  console.info(`removed client, now got ${clients.length} (from ${oldCount})`);
}


wss.on('connection', (ws) => {
  //console.log(`websocket opened`);
  addClient(ws);
  ws.on('message', msg => console.log(msg));
  ws.on('close', () => removeClient(ws));
});


const sampleRecord: IStatsServerSongInfo = {
  "gameVersion": "1.0.3066",
  "inSong": true,
  "tripType": "FullTrip",
  "songLength": 375.23,
  "songTitle": "Jurassic Snack Pack",
  "songArtist": "PrototypeRaptor",
  "choreoName": "Expert",
  "choreographer": "Kinemotik Studios",
  "songID": "4",
  "choreoID": "6bc1bab19320ee19955d6f5fb4fa9e0262ed05a9a1e26c389c73af21904ab22b",
  "playerStatus": "Playing",
  "score": 0,
  "multiplier": 1,
  "playerHealth": -1,
  "curSongTime": 105.119
};


setInterval(updateStatus, 100);

const state: Partial<IStatsServerSongInfo> = {
  curSongTime: 0,
  score: 0,
  multiplier: 0,
};

let lastStart = Date.now()+12000;

function updateStatus() {
  let record: StatsServerPayload = null;
  const now = Date.now();
  if (now < lastStart) {
    record = {
      gameVersion: '1.0.3000-dummy',
      inSong: false,
    };
  } else {
    record = sampleRecord;
    state.curSongTime = (now - lastStart) / 1000;
    const hit = Math.floor(Math.random()*100);
    if (state.multiplier < 8 && Math.random() < 0.1) {
      if (state.multiplier === 1) {
        state.multiplier = 2;
      } else {
        state.multiplier += 2;
      }
    }
    state.score += state.multiplier*hit;
    if (state.curSongTime > record.songLength) {
      state.playerStatus = "Finished";
    }

    record = { ...record, ...state };

    if (state.playerStatus === "Finished") {
      if (state.curSongTime - record.songLength > 15) {
        lastStart = Date.now() + 15000;
        delete state.playerStatus;
        state.score = 0;
        state.multiplier = 1;
        state.playerHealth = 1;
      }
    }
  }


  const msg = JSON.stringify(record);

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

server.listen(48998, '0.0.0.0', 10, () => {
  console.log(`listening `, server.address());
  //console.log('note that this server needs the path to be /websocket');
});
