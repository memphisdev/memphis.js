import * as events from 'events';

import { Memphis, RoundRobinProducerConsumerGenerator } from './memphis'
import { Message } from './message';
import { MemphisError } from './utils'

const maxBatchSize = 5000

export class Consumer {
    private connection: Memphis;
    private stationName: string;
    private internalStationName: string;
    private consumerName: string;
    private internalConsumerName: string;
    private consumerGroup: string;
    private internalConsumerGroupName: string;
    private pullIntervalMs: number;
    private batchSize: number;
    private batchMaxTimeToWaitMs: number;
    private maxAckTimeMs: number;
    private maxMsgDeliveries: number;
    private eventEmitter: events.EventEmitter;
    private pullInterval: any;
    private pingConsumerInvtervalMs: number;
    private pingConsumerInvterval: any;
    private startConsumeFromSequence: number;
    private lastMessages: number;
    public context: object;
    private realName: string;
    private dlsMessages: Message[];
    private dlsCurrentIndex: number;
    private partitionsGenerator: RoundRobinProducerConsumerGenerator;

    constructor(
        connection: Memphis,
        stationName: string,
        consumerName: string,
        consumerGroup: string,
        pullIntervalMs: number,
        batchSize: number,
        batchMaxTimeToWaitMs: number,
        maxAckTimeMs: number,
        maxMsgDeliveries: number,
        startConsumeFromSequence: number,
        lastMessages: number,
        realName: string,
        partitions: number[]
    ) {
        this.connection = connection;
        this.stationName = stationName.toLowerCase();
        this.internalStationName = this.stationName.replace(/\./g, '#');
        this.consumerName = consumerName.toLowerCase();
        this.internalConsumerName = this.consumerName.replace(/\./g, '#');
        this.consumerGroup = consumerGroup.toLowerCase();
        this.internalConsumerGroupName = this.consumerGroup.replace(/\./g, '#');
        this.pullIntervalMs = pullIntervalMs;
        this.batchSize = batchSize;
        this.batchMaxTimeToWaitMs = batchMaxTimeToWaitMs;
        this.maxAckTimeMs = maxAckTimeMs;
        this.maxMsgDeliveries = maxMsgDeliveries;
        this.eventEmitter = new events.EventEmitter();
        this.pullInterval = null;
        this.pingConsumerInvtervalMs = 30000;
        this.pingConsumerInvterval = null;
        this.startConsumeFromSequence = startConsumeFromSequence;
        this.lastMessages = lastMessages;
        this.context = {};
        this.realName = realName;
        this.dlsMessages = []; // cyclic array
        this.dlsCurrentIndex = 0;
        let partitionsLen = 1;
        if (partitions !== null) {
            partitionsLen = partitions.length
        }
        if (partitions.length > 0) {
            this.partitionsGenerator = new RoundRobinProducerConsumerGenerator(partitions);
        }
        const sub = this.connection.brokerManager.subscribe(`$memphis_dls_${this.internalStationName}_${this.internalConsumerGroupName}`, {
            queue: `$memphis_${this.internalStationName}_${this.internalConsumerGroupName}`
        });
        this._handleAsyncIterableSubscriber(sub, true);
    }

    /**
     * Creates an event listener.
     * @param {Object} context - context object that will be passed with each message.
     */
    setContext(context: Object): void {
        this.context = context;
    }

    /**
     * Creates an event listener.
     * @param {String} event - the event to listen to.
     * @param {Function} cb - a callback function.
     */
    on(event: String, cb: (...args: any[]) => void) {
        if (event === 'message') {
            const fetchAndHandleMessages = async () => {
                try {
                    const messages = await this.fetch({ batchSize: this.batchSize });
                    this._handleAsyncConsumedMessages(messages, false);
                } catch (error) {
                    this.eventEmitter.emit('error', MemphisError(error));
                }
            };
            fetchAndHandleMessages();
            this.pullInterval = setInterval(fetchAndHandleMessages, this.pullIntervalMs);

            this.pingConsumerInvterval = setInterval(async () => {
                if (this?.connection?.brokerManager && !this.connection.brokerManager.isClosed()) {
                    this._pingConsumer();
                } else {
                    clearInterval(this.pingConsumerInvterval);
                }
            }, this.pingConsumerInvtervalMs);
        }
        this.eventEmitter.on(<string>event, cb);
    }

    /**
     * Fetch a batch of messages.
     */
    public async fetch({ batchSize = 10 }: { batchSize?: number }): Promise<Message[]> {
        try {
            if (batchSize > maxBatchSize) {
                throw MemphisError(new Error(`Batch size can not be greater than ${maxBatchSize}`));
            }
            let streamName = `${this.internalStationName}`;
            let stationPartitions = this.connection.stationPartitions.get(this.internalStationName)
            if (stationPartitions != null && stationPartitions.length > 0) {
                let partitionNumber = this.partitionsGenerator.Next()
                streamName = `${this.internalStationName}$${partitionNumber.toString()}`
            }
            this.batchSize = batchSize
            let messages: Message[] = [];
            if (this.dlsMessages.length > 0) {
                if (this.dlsMessages.length <= batchSize) {
                    messages = this.dlsMessages;
                    this.dlsMessages = [];
                    this.dlsCurrentIndex = 0;
                } else {
                    messages = this.dlsMessages.splice(0, batchSize);
                    this.dlsCurrentIndex -= messages.length;
                }
                return messages;
            }
            const durableName = this.consumerGroup ? this.internalConsumerGroupName : this.internalConsumerName;
            const batch = await this.connection.brokerConnection.fetch(streamName, durableName,
                { batch: batchSize, expires: this.batchMaxTimeToWaitMs });

            for await (const m of batch)
                messages.push(new Message(m, this.connection, this.consumerGroup, this.internalStationName));

            return messages;
        } catch (ex) {
            throw MemphisError(ex)
        }
    }

    private async _handleAsyncIterableSubscriber(iter: any, isDls: boolean) {
        for await (const m of iter) {
            if (isDls) {
                let indexToInsert = this.dlsCurrentIndex;
                if (this.dlsCurrentIndex >= 10000) {
                    indexToInsert %= 10000;
                }
                this.dlsMessages[indexToInsert] = new Message(m, this.connection, this.consumerGroup,  this.internalStationName);
                this.dlsCurrentIndex++;
            }

            this.eventEmitter.emit('message', new Message(m, this.connection, this.consumerGroup,  this.internalStationName), this.context);
        }
    }

    private async _handleAsyncConsumedMessages(messages: Message[], isDls: boolean) {
        for await (const m of messages) {
            this.eventEmitter.emit('message', m, this.context);
        }
    }


    private async _pingConsumer() {
        try {
            let stationPartitions = this.connection.stationPartitions.get(this.internalStationName)
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            const consumerGroup = this.consumerGroup.replace(/\./g, '#').toLowerCase();
            const consumerName = this.consumerName.replace(/\./g, '#').toLowerCase();
            const durableName = consumerGroup || consumerName;
            if (stationPartitions != null && stationPartitions.length > 0) {
                for (const p of stationPartitions) {
                    await this.connection.brokerStats.consumers.info(`${stationName}$${p}`, durableName);
                }
            } else {
                await this.connection.brokerStats.consumers.info(stationName, durableName);
            }

        } catch (ex) {
            if (ex.message.includes('consumer not found') || ex.message.includes('stream not found')){
                this.eventEmitter.emit('error', MemphisError(new Error('station/consumer were not found')));
            }
        }
    }

    /**
     * Destroy the consumer.
     */
    async destroy(): Promise<void> {
        clearInterval(this.pullInterval);
        try {
            let removeConsumerReq = {
                name: this.consumerName,
                station_name: this.stationName,
                username: this.connection.username,
                connection_id: this.connection.connectionId,
                req_version: 1,
            };
            let data = this.connection.JSONC.encode(removeConsumerReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_consumer_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            let clientNumber = this.connection.clientsPerStation.get(stationName) - 1;
            this.connection.clientsPerStation.set(stationName, clientNumber);
            if (clientNumber === 0) {
                let sub = this.connection.schemaUpdatesSubs.get(stationName);
                if (sub) sub.unsubscribe();
                this.connection.stationSchemaDataMap.delete(stationName);
                this.connection.schemaUpdatesSubs.delete(stationName);
                this.connection.meassageDescriptors.delete(stationName);
                this.connection.jsonSchemas.delete(stationName);
            }
            this.connection._unSetCachedConsumer(this);
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }

    /**
     * for internal propose
     * @returns {string} consumer key
     */
    public _getConsumerKey(): string {
        const internalStationName = this.stationName.replace(/\./g, '#').toLowerCase();
        return `${internalStationName}_${this.realName}`;
    }

    /**
     * for internal propose
     * @returns {string} consumer key
     */
    public _getConsumerStation(): string {
        return this.internalStationName;
    }
}
