#!/usr/bin/env node
const WebSocketServer = require('websocket').server;
const http = require('http');
const express = require('express');
const cors = require('cors');
const app = express();
const dbOperations = require('./lib/dbOperations');
const Promise = require('bluebird');

app.use(cors());

app.get('/createSession', async (request,response) => {

    // Add sequelize model work here:

    //Create sessionId
    const record = { dateTime: new Date(), shipId: 'fafnir' };
    record.id = new Buffer.from(`${request.hostname}:${record.dateTime.getTime()}`).toString('base64');
    const sequelizeInstance = require('./lib/sqlConnection');
    const models = require('topics-models').models(sequelizeInstance);
    const model = models['session'];
    console.log((new Date()) + ' Received request for ' + request.url);
    await dbOperations.sendData({ data: [record], model }).then(async function (sendResults) {
        console.log(sendResults);    
        if (sendResults.error) {
              console.log(sendResults.error, { sendResults })
            }
        }).catch(async function (error) {
            console.log(error);
        });
    response.send(record);
});



const server = http.createServer(app);


server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

const wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept('json', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', async function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            record = JSON.parse(message.utf8Data);
            // If a session event, send to the db as one
            if (record[0].sessionId){
                await Promise.mapSeries(record, async function(rec) {
                    rec.id = new Buffer.from(`${request.hostname}:${new Date(rec.dateTime).getTime()}`).toString('base64');
                    rec.positionX = rec.position.x;
                    rec.positionY = rec.position.y;
                    return rec;
                }).then(async function (record) {
                    const sequelizeInstance = require('./lib/sqlConnection');
                    const models = require('topics-models').models(sequelizeInstance);
                    const model = models['sessionEvent'];
                    console.log(record);
                    await dbOperations.sendData({ data: record, model }).then(async function (sendResults) {
                        console.log(sendResults);    
                        if (sendResults.error) {
                              console.log(sendResults.error, { sendResults })
                            }
                        }).catch(async function (error) {
                            console.log(error);
                        });
                });
            }
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});