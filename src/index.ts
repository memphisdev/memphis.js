// Copyright 2021-2022 The Memphis Authors
// Licensed under the GNU General Public License v3.0 (the “License”);
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.gnu.org/licenses/gpl-3.0.en.html
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import net from 'net';
import events from 'events';
import * as broker from 'nats';
import { headers } from "nats";
import { v4 as uuidv4 } from 'uuid';
import { httpRequest } from './httpRequest';

interface IRetentionTypes {
    MAX_MESSAGE_AGE_SECONDS: string;
    MESSAGES: string;
    BYTES: string;
}

const retentionTypes: IRetentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: "message_age_sec",
    MESSAGES: "messages",
    BYTES: "bytes"
};

interface IStorageTypes {
    FILE: string;
    MEMORY: string;
}

const storageTypes: IStorageTypes = {
    FILE: "file",
    MEMORY: "memory"
};

interface IMessage {
    connection_id: string;
    access_token: string;
    access_token_exp: number;
    ping_interval_ms: number;
    is_error: boolean;
    message: string;
}

class Memphis {
    private isConnectionActive: boolean;
    private connectionId: string;
    public accessToken: string;
    public host: string;
    public managementPort: number;
    private tcpPort: number;
    private dataPort: number;
    private username: string;
    private connectionToken: string;
    private accessTokenTimeout: any;
    private pingTimeout: any;
    private client: net.Socket;
    private reconnectAttempts: number;
    private reconnect: boolean;
    private maxReconnect: number;
    private reconnectIntervalMs: number;
    private timeoutMs: number;
    public brokerConnection: any;
    public brokerManager: any;
    public brokerStats: any;

    constructor() {
        this.isConnectionActive = false;
        this.connectionId = "";
        this.accessToken = "";
        this.host = "";
        this.managementPort = 5555;
        this.tcpPort = 6666;
        this.dataPort = 7766
        this.username = "";
        this.connectionToken = "";
        this.accessTokenTimeout = null;
        this.pingTimeout = null;
        this.client = new net.Socket();
        this.reconnectAttempts = 0;
        this.reconnect = true;
        this.maxReconnect = 3;
        this.reconnectIntervalMs = 200;
        this.timeoutMs = 15000;
        this.brokerConnection = null;
        this.brokerManager = null;
        this.brokerStats = null;

        this.client.on('error', error => {
            console.error(error);
        });

        this.client.on('close', () => {
            this.isConnectionActive = false;
            this._close();
        });
    }

    /**
        * Creates connection with Memphis. 
        * @param {String} host - memphis host.
        * @param {Number} managementPort - management port, default is 5555.
        * @param {Number} tcpPort - tcp port, default is 6666.
        * @param {Number} dataPort - data port, default is 7766 .
        * @param {String} username - user of type root/application.
        * @param {String} connectionToken - broker token.
        * @param {Boolean} reconnect - whether to do reconnect while connection is lost.
        * @param {Number} maxReconnect - The reconnect attempts.
        * @param {Number} reconnectIntervalMs - Interval in miliseconds between reconnect attempts.
        * @param {Number} timeoutMs - connection timeout in miliseconds.
    */
    connect({ host, managementPort = 5555, tcpPort = 6666, dataPort = 7766, username, connectionToken, reconnect = true, maxReconnect = 3, reconnectIntervalMs = 200, timeoutMs = 15000 }:
        {
            host: string, managementPort: number, tcpPort: number, dataPort: number, username: string, connectionToken: string, reconnect: boolean, maxReconnect: number,
            reconnectIntervalMs: number, timeoutMs: number
        }): Promise<void> {
        return new Promise((resolve, reject) => {
            this.host = this._normalizeHost(host);
            this.managementPort = managementPort;
            this.tcpPort = tcpPort;
            this.dataPort = dataPort;
            this.username = username;
            this.connectionToken = connectionToken;
            this.reconnect = reconnect;
            this.maxReconnect = maxReconnect > 9 ? 9 : maxReconnect;
            this.reconnectIntervalMs = reconnectIntervalMs;
            this.timeoutMs = timeoutMs;

            this.client.connect(this.tcpPort, this.host, () => {
                this.client.write(JSON.stringify({
                    username: username,
                    broker_creds: connectionToken,
                    connection_id: this.connectionId
                }));
                let connected = false;

                this.client.on('data', async data => {
                    let message: IMessage;
                    try {
                        message = JSON.parse(data.toString())
                    } catch (ex) {
                        return reject(data.toString());
                    }
                    this.connectionId = message.connection_id;
                    this.isConnectionActive = true;
                    this.reconnectAttempts = 0;

                    if (message.access_token) {
                        this.accessToken = message.access_token;
                        this._keepAcessTokenFresh(message.access_token_exp);
                    }

                    if (message.ping_interval_ms)
                        this._pingServer(message.ping_interval_ms);

                    if (!connected) {
                        try {
                            this.brokerManager = await broker.connect({
                                servers: `${this.host}:${this.dataPort}`,
                                reconnect: this.reconnect,
                                maxReconnectAttempts: this.reconnect ? this.maxReconnect : 0,
                                reconnectTimeWait: this.reconnectIntervalMs,
                                timeout: this.timeoutMs,
                                token: this.connectionToken
                            });

                            this.brokerConnection = this.brokerManager.jetstream();
                            this.brokerStats = await this.brokerManager.jetstreamManager();
                            connected = true;
                            return resolve();
                        } catch (ex) {
                            return reject(ex);
                        }
                    }
                });
            });

            setTimeout(() => {
                if (!reconnect || this.reconnectAttempts === maxReconnect || !this.isConnectionActive)
                    reject(new Error("Connection timeout has reached"));
            }, timeoutMs);
        });
    }

    private _normalizeHost(host: string): string {
        if (host.startsWith("http://"))
            return host.split("http://")[1];
        else if (host.startsWith("https://"))
            return host.split("https://")[1];
        else
            return host;
    }

    private _keepAcessTokenFresh(expiresIn: number) {
        this.accessTokenTimeout = setTimeout(() => {
            if (this.isConnectionActive)
                this.client.write(JSON.stringify({
                    resend_access_token: true
                }));
        }, expiresIn)
    }

    private _pingServer(interval: number) {
        this.pingTimeout = setTimeout(() => {
            if (this.isConnectionActive)
                this.client.write(JSON.stringify({
                    ping: true
                }));
        }, interval);
    }

    /**
        * Creates a factory. 
        * @param {String} name - factory name.
        * @param {String} description - factory description (optional).
    */
    async factory({ name, description = "" }: { name: string, description: string }): Promise<Factory> {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");

            // this.client.write(JSON.stringify({
            //     operation: 'createFactory',
            //     input: {
            //         factory_name: name,
            //         description: description
            //     }
            // }));

            // this.client.on('data', async data => {
            //     let message: IMessage;
            //     try {
            //         message = JSON.parse(data.toString())
            //     } catch (ex) {
            //         throw ex
            //     }})

            const response = await httpRequest({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/factories/createFactory`,
                headers: {
                    Authorization: "Bearer " + this.accessToken
                },
                bodyParams: { name, description },
            });

            return new Factory(this, response.name);
        } catch (ex) {
            if (typeof (ex) == "string") {
                return new Factory(this, name.toLowerCase());
            }
            throw ex;
        }
    }

    /**
        * Creates a station. 
        * @param {String} name - station name.
        * @param {String} factoryName - factory name to link the station with.
        * @param {Memphis.retentionTypes} retentionType - retention type, default is MAX_MESSAGE_AGE_SECONDS.
        * @param {Number} retentionValue - number which represents the retention based on the retentionType, default is 604800.
        * @param {Memphis.storageTypes} storageType - persistance storage for messages of the station, default is storageTypes.FILE.
        * @param {Number} replicas - number of replicas for the messages of the data, default is 1.
        * @param {Boolean} dedupEnabled - whether to allow dedup mecanism, dedup happens based on message ID, default is false.
        * @param {Number} dedupWindowMs - time frame in which dedup track messages, default is 0.
    */
    async station({ name, factoryName, retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS, retentionValue = 604800,
        storageType = storageTypes.FILE, replicas = 1, dedupEnabled = false, dedupWindowMs = 0 }:
        {
            name: string, factoryName: string, retentionType: string, retentionValue: number, storageType: string,
            replicas: number, dedupEnabled: boolean, dedupWindowMs: number
        }): Promise<Station> {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");
            const response = await httpRequest({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/stations/createStation`,
                headers: {
                    Authorization: "Bearer " + this.accessToken
                },
                bodyParams: {
                    name: name,
                    factory_name: factoryName,
                    retention_type: retentionType,
                    retention_value: retentionValue,
                    storage_type: storageType,
                    replicas: replicas,
                    dedup_enabled: dedupEnabled,
                    dedup_window_in_ms: dedupWindowMs
                }
            });

            return new Station(this, response.name);
        } catch (ex) {
            if (typeof (ex) == "string") {
                return new Station(this, name.toLowerCase());
            }
            throw ex;
        }
    }

    /**
        * Creates a producer. 
        * @param {String} stationName - station name to produce messages into.
        * @param {String} producerName - name for the producer.
    */
    async producer({ stationName, producerName }: { stationName: string, producerName: string }): Promise<Producer> {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");

            await httpRequest({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/producers/createProducer`,
                headers: {
                    Authorization: "Bearer " + this.accessToken
                },
                bodyParams: {
                    name: producerName,
                    station_name: stationName,
                    connection_id: this.connectionId,
                    producer_type: "application"
                },
            });

            return new Producer(this, producerName, stationName);
        } catch (ex) {
            throw ex;
        }
    }

    /**
        * Creates a consumer. 
        * @param {String} stationName - station name to consume messages from.
        * @param {String} consumerName - name for the consumer.
        * @param {String} consumerGroup - consumer group name, default is "".
        * @param {Number} pullIntervalMs - interval in miliseconds between pulls, default is 1000.
        * @param {Number} batchSize - pull batch size.
        * @param {Number} batchMaxTimeToWaitMs - max time in miliseconds to wait between pulls, defauls is 5000.
        * @param {Number} maxAckTimeMs - max time for ack a message in miliseconds, in case a message not acked in this time period the Memphis broker will resend it
    */
    async consumer({ stationName, consumerName, consumerGroup = "", pullIntervalMs = 1000, batchSize = 10,
        batchMaxTimeToWaitMs = 5000, maxAckTimeMs = 30000 }:
        {
            stationName: string, consumerName: string, consumerGroup: string, pullIntervalMs: number,
            batchSize: number, batchMaxTimeToWaitMs: number, maxAckTimeMs: number
        }): Promise<Consumer> {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");

            await httpRequest({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/consumers/createConsumer`,
                headers: {
                    Authorization: "Bearer " + this.accessToken
                },
                bodyParams: {
                    name: consumerName,
                    station_name: stationName,
                    connection_id: this.connectionId,
                    consumer_type: "application",
                    consumers_group: consumerGroup,
                    max_ack_time_ms: maxAckTimeMs
                },
            });

            return new Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs);
        } catch (ex) {
            throw ex;
        }
    }

    private _close() {
        if (this.reconnect && this.reconnectAttempts < this.maxReconnect) {
            this.reconnectAttempts++;
            setTimeout(async () => {
                try {
                    await this.connect({
                        host: this.host,
                        managementPort: this.managementPort,
                        tcpPort: this.tcpPort,
                        dataPort: this.dataPort,
                        username: this.username,
                        connectionToken: this.connectionToken,
                        reconnect: this.reconnect,
                        maxReconnect: this.maxReconnect,
                        reconnectIntervalMs: this.reconnectIntervalMs,
                        timeoutMs: this.timeoutMs
                    });
                    console.log("Reconnect to memphis has been succeeded");
                } catch (ex) {
                    console.error("Failed reconnect to memphis");
                    return;
                }
            }, this.reconnectIntervalMs);
        }
        else if (this.isConnectionActive) {
            this.client.removeAllListeners("data");
            this.client.removeAllListeners("error");
            this.client.removeAllListeners("close");
            this.client.destroy();
            clearTimeout(this.accessTokenTimeout);
            clearTimeout(this.pingTimeout);
            this.reconnectAttempts = 0;
            setTimeout(() => {
                this.brokerManager && this.brokerManager.close();
            }, 500);
        }
    }

    /**
        * Close Memphis connection. 
    */
    close() {
        if (this.isConnectionActive) {
            this.client.removeAllListeners("data");
            this.client.removeAllListeners("error");
            this.client.removeAllListeners("close");
            this.client.destroy();
            clearTimeout(this.accessTokenTimeout);
            clearTimeout(this.pingTimeout);
            this.reconnectAttempts = 0;
            setTimeout(() => {
                this.brokerManager && this.brokerManager.close();
            }, 500);
        }
    }
}

class Producer {
    private connection: Memphis;
    private producerName: string;
    private stationName: string;

    constructor(connection: Memphis, producerName: string, stationName: string) {
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        this.stationName = stationName.toLowerCase();
    }

    /**
        * Produces a message into a station. 
        * @param {Uint8Array} message - message to send into the station.
        * @param {Number} ackWaitSec - max time in seconds to wait for an ack from memphis.
    */
    async produce({ message, ackWaitSec = 15 }: { message: Uint8Array, ackWaitSec: number }): Promise<void> {
        try {
            const h = headers();
            h.append("producedBy", this.producerName);
            await this.connection.brokerConnection.publish(`${this.stationName}.final`, message, { msgID: uuidv4(), headers: h, ackWait: ackWaitSec * 1000 * 1000000 });
        } catch (ex: any) {
            if (ex.code === '503') {
                throw new Error("Produce operation has failed, please check wheether Station/Producer are still exist");
            }
            throw ex;
        }
    }

    /**
        * Destroy the producer. 
    */
    async destroy(): Promise<void> {
        try {
            await httpRequest({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/producers/destroyProducer`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken
                },
                bodyParams: {
                    name: this.producerName,
                    station_name: this.stationName
                },
            });
        } catch (_) { }
    }
}

class Consumer {
    private connection: Memphis;
    private stationName: string;
    private consumerName: string;
    private consumerGroup: string;
    private pullIntervalMs: number;
    private batchSize: number;
    private batchMaxTimeToWaitMs: number;
    private maxAckTimeMs: number;
    private eventEmitter: events.EventEmitter;
    private pullInterval: any;
    private pingConsumerInvtervalMs: number;
    private pingConsumerInvterval: any;

    constructor(connection: Memphis, stationName: string, consumerName: string, consumerGroup: string, pullIntervalMs: number,
        batchSize: number, batchMaxTimeToWaitMs: number, maxAckTimeMs: number) {
        this.connection = connection;
        this.stationName = stationName.toLowerCase();
        this.consumerName = consumerName.toLowerCase();
        this.consumerGroup = consumerGroup.toLowerCase();
        this.pullIntervalMs = pullIntervalMs;
        this.batchSize = batchSize;
        this.batchMaxTimeToWaitMs = batchMaxTimeToWaitMs;
        this.maxAckTimeMs = maxAckTimeMs;
        this.eventEmitter = new events.EventEmitter();
        this.pullInterval = null;
        this.pingConsumerInvtervalMs = 30000;
        this.pingConsumerInvterval = null;

        this.connection.brokerConnection.pullSubscribe(`${this.stationName}.final`, {
            mack: true,
            config: {
                durable_name: this.consumerGroup ? this.consumerGroup : this.consumerName,
                ack_wait: this.maxAckTimeMs,
            },
        }).then(async (psub: any) => {
            psub.pull({ batch: this.batchSize, expires: this.batchMaxTimeToWaitMs });
            this.pullInterval = setInterval(() => {
                if (!this.connection.brokerManager.isClosed())
                    psub.pull({ batch: this.batchSize, expires: this.batchMaxTimeToWaitMs });
                else
                    clearInterval(this.pullInterval)
            }, this.pullIntervalMs);

            this.pingConsumerInvterval = setInterval(async () => {
                if (!this.connection.brokerManager.isClosed()) {
                    this._pingConsumer()
                }
                else
                    clearInterval(this.pingConsumerInvterval)
            }, this.pingConsumerInvtervalMs);

            for await (const m of psub) {
                this.eventEmitter.emit("message", new Message(m));
            }
        }).catch((error: any) => this.eventEmitter.emit("error", error));
    }

    /**
        * Creates an event listener. 
        * @param {String} event - the event to listen to.
        * @param {Function} cb - a callback function.
    */
    on(event: String, cb: (...args: any[]) => void) {
        this.eventEmitter.on(<string>event, cb);
    }

    private async _pingConsumer() {
        try {
            const durableName = this.consumerGroup || this.consumerName;
            await this.connection.brokerStats.consumers.info(this.stationName, durableName)
        } catch (ex) {
            this.eventEmitter.emit("error", "station/consumer were not found");
        }
    }

    /**
        * Destroy the consumer. 
    */
    async destroy(): Promise<void> {
        this.eventEmitter.removeAllListeners("message");
        this.eventEmitter.removeAllListeners("error");
        clearInterval(this.pullInterval);
        clearInterval(this.pingConsumerInvterval);
        try {
            await httpRequest({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/consumers/destroyConsumer`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken
                },
                bodyParams: {
                    name: this.consumerName,
                    station_name: this.stationName
                },
            });
        } catch (_) { }
    }
}

class Message {
    private message: broker.JsMsg;

    constructor(message: broker.JsMsg) {
        this.message = message;
    }

    /**
        * Ack a message is done processing. 
    */
    ack() {
        this.message.ack();
    }

    getData() {
        return this.message.data;
    }
}

class Factory {
    private connection: Memphis;
    private name: string;

    constructor(connection: Memphis, name: string) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }

    /**
        * Destroy the factory. 
    */
    async destroy(): Promise<void> {
        try {
            await httpRequest({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/factories/removeFactory`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken
                },
                bodyParams: {
                    factory_name: this.name
                },
            });
        } catch (ex) {
            throw ex;
        }
    }
}

class Station {
    private connection: Memphis;
    private name: string;

    constructor(connection: Memphis, name: string) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }

    /**
       * Destroy the station. 
   */
    async destroy(): Promise<void> {
        try {
            await httpRequest({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/stations/removeStation`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken
                },
                bodyParams: {
                    station_name: this.name
                },
            });
        } catch (ex) {
            throw ex;
        }
    }
}

module.exports = new Memphis();
module.exports.retentionTypes = retentionTypes;
module.exports.storageTypes = storageTypes;
