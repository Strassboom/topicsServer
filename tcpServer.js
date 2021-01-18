#!/usr/bin/env node
const WebSocketServer = require('websocket').server;
const http = require('http');
const express = require('express');
const cors = require('cors');
const app = express();
const dbOperations = require('./lib/dbOperations');

app.use(cors());

app.get('/createSession', async (request,response) => {

    // Add sequelize model work here:

    //Create sessionId
    const record = { creationDate: new Date(), shipId: 'fafnir' };
    record.sessionId = new Buffer.from(`${request.host}:${new Date().getTime()}`).toString('base64');
    const sequelizeInstance = require('./lib/sqlConnection');
    const models = require('topics-models').models(sequelizeInstance);
    const model = models['session'];
    console.log((new Date()) + ' Received request for ' + request.url);
    await dbOperations.sendData({ data: record, model }).then(async function (sendResults) {
            if (sendResults.error) {
              console.log(sendResults.error, { sendResults, locationId })
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
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            record = JSON.parse(message.utf8Data);
            if (record[0].sessionId){
                const sequelizeInstance = require('./lib/sqlConnection');
                const models = require('topics-models').models(sequelizeInstance);
                const model = models['sessionEvent'];
                console.log('SEND THIS TO THE DB');
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