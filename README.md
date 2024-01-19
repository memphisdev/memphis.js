<a href="![Github (4)](https://github.com/memphisdev/memphis-terraform/assets/107035359/a5fe5d0f-22e1-4445-957d-5ce4464e61b1)">[![Github (4)](https://github.com/memphisdev/memphis-terraform/assets/107035359/a5fe5d0f-22e1-4445-957d-5ce4464e61b1)](https://memphis.dev)</a>
<p align="center">
<a href="https://memphis.dev/discord"><img src="https://img.shields.io/discord/963333392844328961?color=6557ff&label=discord" alt="Discord"></a>
<a href="https://github.com/memphisdev/memphis/issues?q=is%3Aissue+is%3Aclosed"><img src="https://img.shields.io/github/issues-closed/memphisdev/memphis?color=6557ff"></a> 
  <img src="https://img.shields.io/npm/dw/memphis-dev?color=ffc633&label=installations">
<a href="https://github.com/memphisdev/memphis/blob/master/CODE_OF_CONDUCT.md"><img src="https://img.shields.io/badge/Code%20of%20Conduct-v1.0-ff69b4.svg?color=ffc633" alt="Code Of Conduct"></a> 
<img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/memphisdev/memphis?color=61dfc6">
<img src="https://img.shields.io/github/last-commit/memphisdev/memphis?color=61dfc6&label=last%20commit">
</p>

<div align="center">
  
<img width="177" alt="cloud_native 2 (5)" src="https://github.com/memphisdev/memphis/assets/107035359/a20ea11c-d509-42bb-a46c-e388c8424101">
  
</div>
 <b><p align="center">
  <a href="https://memphis.dev/pricing/">Cloud</a> - <a href="https://memphis.dev/docs/">Docs</a> - <a href="https://twitter.com/Memphis_Dev">X</a> - <a href="https://www.youtube.com/channel/UCVdMDLCSxXOqtgrBaRUHKKg">YouTube</a>
</p></b>

<div align="center">

  <h4>

**[Memphis.dev](https://memphis.dev)** is a highly scalable, painless, and effortless data streaming platform.<br>
Made to enable developers and data teams to collaborate and build<br>
real-time and streaming apps fast.

  </h4>
  
</div>.

## Installation

```sh
$ npm install memphis-dev
```

## Importing

For Javascript, you can choose to use the import or required keyword. This library exports a singleton instance of `memphis` with which you can consume and produce messages.

```js
const { memphis } = require('memphis-dev');
```

For Typescript, use the import keyword. You can import `Memphis` to aid for typechecking assistance.

```js
import { memphis, Memphis } from 'memphis-dev';
```

To leverage Nestjs dependency injection feature

```js
import { Module } from '@nestjs/common';
import { Memphis, MemphisModule, MemphisService } from 'memphis-dev';
```

### Quickstart - Producing and Consuming

The most basic functionaly of memphis is the ability to produce messages to a station and to consume those messages. 

First, a connection to Memphis must be made:

```js
const { memphis } = require('memphis-dev');

// Connecting to the broker
memphis = Memphis()

let conn = await memphis.connect({
        host: "<memphis-host>",
        username: "<memphis-username>", // (root/application type user)
        accountId: <memphis-accountid/>, // You can find it on the profile page in the Memphis UI. This field should be sent only on the cloud version of Memphis, otherwise it will be ignored
        password: "<memphis-password>"
});
```

Then, to produce a message, call the `memphis.produce` function or create a producer and call its `producer.produce` function:

```js
await memphis.produce({
        stationName:"<station-name>",
        producerName:"<producer-name>",
        message: {
            "Hello": "World"
        }
});

conn.close()
```

Lastly, to consume this message, call the `memphis.fetch_messages` function or create a consumer and call its `consumer.fetch` function:

```js
let messages = await memphis.fetchMessages({
    stationName:"<station-name>",
    consumerName:"<consumer-name>",
});

for (let message of messages){
    const messageObject = JSON.parse(message.getData().toString());
    // Do something with the message
    console.log(messageObject["Hello"]);
    message.ack()
}

conn.close()
```

> Note: Remember to close the connection or the process won't exit!

### Connecting to Memphis

First, we need to connect with Memphis by using `memphis.connect`.

```js
/* Javascript and typescript project */
await memphis.connect({
            host: "<memphis-host>",
            port: <port>, // defaults to 6666
            username: "<username>", // (root/application type user)
            accountId: <accountId> //You can find it on the profile page in the Memphis UI. This field should be sent only on the cloud version of Memphis, otherwise it will be ignored
            connectionToken: "<broker-token>", // you will get it on application type user creation
            password: "<string>", // depends on how Memphis deployed - default is connection token-based authentication
            reconnect: true, // defaults to true
            maxReconnect: 10, // The default value is -1 which means reconnect indefinitely
            reconnectIntervalMs: 1500, // defaults to 1500
            timeoutMs: 15000, // defaults to 15000
            // for TLS connection:
            keyFile: '<key-client.pem>',
            certFile: '<cert-client.pem>',
            caFile: '<rootCA.pem>'
            suppressLogs: false // defaults to false - indicates whether to suppress logs or not
      });
```

The connect function in the Memphis class allows for the connection to Memphis. Connecting to Memphis (cloud or open-source) will be needed in order to use any of the other functionality of the Memphis class. Upon connection, all of Memphis' features are available.

Nest injection

```js
@Module({
    imports: [MemphisModule.register()],
})

class ConsumerModule {
    constructor(private memphis: MemphisService) {}

    startConnection() {
        (async function () {
            let memphisConnection: Memphis;

            try {
               memphisConnection = await this.memphis.connect({
                    host: "<memphis-host>",
                    username: "<application type username>",
                    connectionToken: "<broker-token>",
                });
            } catch (ex) {
                console.log(ex);
                memphisConnection.close();
            }
        })();
    }
}
```

What arguments are used with the Memphis.connect function change depending on the type of connection being made. Memphis uses password-based connections by default. An example of a password-based connection would look like this (using the defualt root memphis login with Memphis open-source):

```typescript
async function connectPassword(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({
                host: "localhost",
                username: "root", // (root/application type user)
                password: "memphis" 
                });
    }catch(exception){
        // Handle exception
    }
}
```

If you wanted to connect to Memphis cloud instead, simply add your account ID and change the host. The host and account_id can be found on the Overview page in the Memphis cloud UI under your name at the top. Here is an example to connecting to a cloud broker that is located in US East:  

```typescript
async function connectPasswordCloud(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({
                host: "aws-us-east-1.cloud.memphis.dev",
                username: "my_client_username", // (root/application type user)
                password: "my_client_password",
                accountId: 123456789
                });
    }catch(exception){
        // Handle exception
    }
}
```

It is possible to use a token-based connection to memphis as well, where multiple users can share the same token to connect to memphis. Here is an example of using memphis.connect with a token:

```typescript
async function connectToken(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({
                host: "localhost",
                username: "root", // (root/application type user)
                connectionToken: "token"
                });
    }catch(exception){
        // Handle exception
    }
}
```

The token will be presented when creating new users.

Memphis needs to be configured to use token based connection. See the [docs](https://docs.memphis.dev/memphis/memphis-broker/concepts/security) for help doing this.

A TLS based connection would look like this:

```typescript
async function connectTLS(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({
                host: "localhost",
                username: "root", // (root/application type user)
                keyFile: "~/tls_file_path.key",
                certFile: "~/tls_cert_file_path.crt",
                caFile: "~/tls_ca_file_path.crt"
                });
    }catch(exception){
        // Handle exception
    }
}
```

Memphis needs to configured for these use cases. To configure memphis to use TLS see the [docs](https://docs.memphis.dev/memphis/open-source-installation/kubernetes/production-best-practices#memphis-metadata-tls-connection-configuration). 

### Disconnecting from Memphis

To disconnect from Memphis, call `close()` on the memphis object.

```js
memphisConnection.close();
```

### Creating a Station

Stations are distributed units that store messages. Producers add messages to stations and Consumers take messages from them. Each station stores messages until their retention policy causes them to either delete the messages or move them to [remote storage](https://docs.memphis.dev/memphis/integrations-center/storage/s3-compatible). 

**A station will be automatically created for the user when a consumer or producer is used if no stations with the given station name exist.**<br><br>
_If the station trying to be created exists when this function is called, nothing will change with the exisitng station_

```js
const station = await memphis.station({
    name: '<station-name>',
    schemaName: '<schema-name>',
    retentionType: memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS, // defaults to memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS
    retentionValue: 3600, // defaults to 3600
    storageType: memphis.storageTypes.DISK, // defaults to memphis.storageTypes.DISK
    replicas: 1, // defaults to 1
    idempotencyWindowMs: 0, // defaults to 120000
    sendPoisonMsgToDls: true, // defaults to true
    sendSchemaFailedMsgToDls: true, // defaults to true
    tieredStorageEnabled: false, // defaults to false
    partitionsNumber: 1, // defaults to 1
    dlsStation:'<station-name>' // defaults to "" (no DLS station) - If selected DLS events will be sent to selected station as well
});
```

The station function is used to create a station. Using the different arguemnts, one can programically create many different types of stations. The Memphis UI can also be used to create stations to the same effect. 

Creating a station with Nestjs dependency injection

```js
@Module({
    imports: [MemphisModule.register()],
})

class stationModule {
    constructor(private memphis: MemphisService) { }

    createStation() {
        (async function () {
                  const station = await this.memphis.station({
                        name: "<station-name>",
                        schemaName: "<schema-name>",
                        retentionType: memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS, // defaults to memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS
                        retentionValue: 604800, // defaults to 604800
                        storageType: memphis.storageTypes.DISK, // defaults to memphis.storageTypes.DISK
                        replicas: 1, // defaults to 1
                        idempotencyWindowMs: 0, // defaults to 120000
                        sendPoisonMsgToDls: true, // defaults to true
                        sendSchemaFailedMsgToDls: true, // defaults to true
                        tieredStorageEnabled: false, // defaults to false
                        dlsStation:'<station-name>' // defaults to "" (no DLS station) - If selected DLS events will be sent to selected station as well
                  });
        })();
    }
}
```

A minimal example, using all default values would simply create a station with the given name:

```typescript
async function stationDefault(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation"
        });
    }catch(exception){
        // Handle exception
    }
}
```

To change what criteria the station uses to decide if a message should be retained in the station, change the retention type. The different types of retention are documented [here](https://github.com/memphisdev/memphis.js#retention-types) in the node README. 

The unit of the rentention value will vary depending on the RetentionType. The [previous link](https://github.com/memphisdev/memphis.js#retention-types) also describes what units will be used. 

Here is an example of a station which will only hold up to 10 messages:

```typescript
async function stationRetentionType(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation",
            retentionType: memphis.retentionTypes.MESSAGES
        });
    }catch(exception){
        // Handle exception
    }
}
```

Memphis stations can either store Messages on disk or in memory. A comparison of those types of storage can be found [here](https://docs.memphis.dev/memphis/memphis-broker/concepts/storage-and-redundancy#tier-1-local-storage).

Here is an example of how to create a station that uses Memory as its storage type:

```typescript
async function stationMemoryStorage(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation",
            storageType: memphis.storageTypes.MEMORY
        });
    }catch(exception){
        // Handle exception
    }
}
```

In order to make a station more redundant, replicas can be used. Read more about replicas [here](https://docs.memphis.dev/memphis/memphis-broker/concepts/storage-and-redundancy#replicas-mirroring). Note that replicas are only available in cluster mode. Cluster mode can be enabled in the [Helm settings](https://docs.memphis.dev/memphis/open-source-installation/kubernetes/1-installation#appendix-b-helm-deployment-options) when deploying Memphis with Kubernetes.

Here is an example of creating a station with 3 replicas:

```typescript
async function stationWithReplicas(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation",
            replicas: 3
        });
    }catch(exception){
        // Handle exception
    }
}
```

Idempotency defines how Memphis will prevent duplicate messages from being stored or consumed. The duration of time the message ID's will be stored in the station can be set with idempotencyWindowsMs. If the environment Memphis is deployed in has unreliably connection and/or a lot of latency, increasing this value might be desiriable. The default duration of time is set to two minutes. Read more about idempotency [here](https://docs.memphis.dev/memphis/memphis-broker/concepts/idempotency).

Here is an example of changing the idempotency window to 3 seconds:

```typescript
async function stationIdempotency(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation",
            idempotencyWindowMs: 180000
        });
    }catch(exception){
        // Handle exception
    }
}
```

The schema name is used to set a schema to be enforced by the station. The default value of "" ensures that no schema is enforced. Here is an example of changing the schema to a defined schema in schemaverse called "sensorLogs":

```typescript
async function stationWithSchema(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation",
            schemaName: "sensorLogs"
        });
    }catch(exception){
        // Handle exception
    }
}
```

There are two parameters for sending messages to the [dead-letter station(DLS)](https://docs.memphis.dev/memphis/memphis-broker/concepts/dead-letter#terminology). These are sendPoisonMsgToDls and sendSchemaFailedMsgToDls. 

Here is an example of sending poison messages to the DLS but not messages which fail to conform to the given schema.

```typescript
async function stationWithDeadLetter(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation",
            sendPoisonMsgToDls: true,
            sendSchemaFailedMsgToDls: false
        });
    }catch(exception){
        // Handle exception
    }
}
```

When either of the DLS flags are set to True, a station can also be set to handle these events. To set a station as the station to where schema failed or poison messages will be set to, use the DlsStation parameter:

```typescript
async function stationWithDeadLetterToStation(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation",
            sendPoisonMsgToDls: true,
            sendSchemaFailedMsgToDls: false,
            dlsStation: "badSensorLogsStation"
        });
    }catch(exception){
        // Handle exception
    }
}
```

When the retention value is met, Memphis by default will delete old messages. If tiered storage is setup, Memphis can instead move messages to tier 2 storage. Read more about tiered storage [here](https://docs.memphis.dev/memphis/memphis-broker/concepts/storage-and-redundancy#storage-tiering). Enable this setting with the respective flag:

```typescript
async function stationWithTieredStorage(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation",
            tieredStorageEnabled: true
        });
    }catch(exception){
        // Handle exception
    }
}
```

[Partitioning](https://docs.memphis.dev/memphis/memphis-broker/concepts/station#partitions) might be useful for a station. To have a station partitioned, simply change the partitions number:

```typescript
async function stationWithPartitions(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.station({
            name: "myStation",
            partitionsNumber: 3
        });
    }catch(exception){
        // Handle exception
    }
}
```


### Retention types

Retention types define the methodology behind how a station behaves with its messages. Memphis currently supports the following retention types:

```js
memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS;
```

When the retention type is set to MAX_MESSAGE_AGE_SECONDS, messages will persist in the station for the number of seconds specified in the retention_value. 

```js
memphis.retentionTypes.MESSAGES;
```

When the retention type is set to MESSAGES, the station will only hold up to retention_value messages. The station will delete the oldest messsages to maintain a retention_value number of messages.

```js
memphis.retentionTypes.BYTES;
```

When the retention type is set to BYTES, the station will only hold up to retention_value BYTES. The oldest messages will be deleted in order to maintain at maximum retention_vlaue BYTES in the station.

```js
memphis.retentionTypes.ACK_BASED; // for cloud users only
```

When the retention type is set to ACK_BASED, messages in the station will be deleted after they are acked by all subscribed consumer groups.

### Retention Values

The unit of the `retention value` changes depending on the `retention type` specified. 

All retention values are of type `int`. The following units are used based on the respective retention type:

`memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS` is **in seconds**, <br>
`memphis.retentionTypes.MESSAGES` is a **number of messages**, <br>
`memphis.retentionTypes.BYTES` is a **number of bytes** <br>
With `memphis.retentionTypes.ACK_BASED`, the `retentionValue` is ignored.

### Storage types

Memphis currently supports the following types of messages storage:

```js
memphis.storageTypes.DISK;
```

When storage is set to DISK, messages are stored on disk.

```js
memphis.storageTypes.MEMORY;
```

When storage is set to MEMORY, messages are stored in the system memory.

### Destroying a Station

Destroying a station will remove all its resources (producers/consumers)

```js
await station.destroy();
```

### Creating a new schema 
In case schema is already exist a new version will be created

```js
await memphisConnection.createSchema({schemaName: "<schema-name>", schemaType: "<schema-type>", schemaFilePath: "<schema-file-path>" });
```

### Enforcing a schema on an existing Station

```js
await memphisConnection.enforceSchema({ name: '<schema-name>', stationName: '<station-name>' });
```

### Deprecated - Use enforceSchema instead

```js
await memphisConnection.attachSchema({ name: '<schema-name>', stationName: '<station-name>' });
```

### Detaching a schema from Station

```js
await memphisConnection.detachSchema({ stationName: '<station-name>' });
```

### Produce and Consume messages

The most common client operations are using `produce` to send messages and `consume` to
receive messages.

Messages are published to a station with a Producer and consumed from it by a Consumer. 

Consumers are poll based and consume all the messages in a station. Consumers can also be grouped into consumer groups. When consuming with a consumer group, all consumers in the group will receive each message.

Memphis messages are payload agnostic. Payloads are always `bytearray`s.

In order to stop getting messages, you have to call `consumer.destroy()`. Destroy will terminate the consumer even if messages are currently being sent to the consumer.

If a station is created with more than one partition, producing to and consuming from the station will happen in a round robin fashion. 

### Creating a Producer

```js
const producer = await memphisConnection.producer({
    stationName: '<station-name>',
    producerName: '<producer-name>',
});
```

Creating producers with nestjs dependecy injection

```js
@Module({
    imports: [MemphisModule.register()],
})

class ProducerModule {
    constructor(private memphis: MemphisService) { }

    createProducer() {
        (async function () {
                const producer = await memphisConnection.producer({
                    stationName: "<station-name>",
                    producerName: "<producer-name>"
                });
        })();
    }
}
```

### Producing a message

Both producers and connections can use the produce function. To produce a message from a connection, simply call `memphis.produce`. This function will create a producer if none with the given name exists, otherwise it will pull the producer from a cache and use it to produce the message. 

```js
await memphisConnection.produce({
        stationName: '<station-name>',
        producerName: '<producer-name>',
        message: 'Uint8Arrays/object/string/DocumentNode graphql', // Uint8Arrays/object (schema validated station - protobuf) or Uint8Arrays/object (schema validated station - json schema) or Uint8Arrays/string/DocumentNode graphql (schema validated station - graphql schema) or Uint8Arrays/object (schema validated station - avro schema)
        ackWaitSec: 15, // defaults to 15
        asyncProduce: true // defaults to true. For better performance. The client won't block requests while waiting for an acknowledgment.
        headers: headers, // defults to empty
        msgId: 'id', // defaults to null
        producerPartitionKey: "key", // produce to specific partition. defaults to null
        producerPartitionNumber: -1 // produce to specific partition number. defaults to -1
});
```

Creating a producer and calling produce on it will increase the performance of producing messages as it removes the overhead of pulling created producers from the cache.

```js
await producer.produce({
    message: 'Uint8Arrays/object/string/DocumentNode graphql', // Uint8Arrays/object (schema validated station - protobuf) or Uint8Arrays/object (schema validated station - json schema) or Uint8Arrays/string/DocumentNode graphql (schema validated station - graphql schema) or Uint8Arrays/object (schema validated station - avro schema)
    ackWaitSec: 15, // defaults to 15,
    producerPartitionKey: "key", // produce to specific partition. defaults to null
    producerPartitionNumber: -1 // produce to specific partition number. defaults to -1
});
```

Note:
When producing to a station with more than one partition, the producer will produce messages in a Round Robin fashion between the different partitions.

For message data formats see [here](https://docs.memphis.dev/memphis/memphis-schemaverse/formats/produce-consume). 

When producing many messages with a producer, asyncProduce may be used to help increase the performance of the producer. By default, a producer will produce messages asynchronously. This can be set to false to increase reliability. 

Here is an example of a produce function call that waits up to 30 seconds for an acknowledgement from the memphis broker and does so in an async manner:

```typescript
async function produceAsync(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.produce({
            stationName: "myStation",
            producerName: "tempProducer",
            message: {some: "message"},
            ackWaitSec: 30,
            asyncProduce: true
        });
    }catch(exception){
        // Handle exception
    }
}
```

As discussed before in the station section, idempotency is an important feature of memphis. To achieve idempotency, an id must be assigned to messages that are being produced. Use the msgId parameter for this purpose.

```typescript
async function produceWithIdempotency(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.produce({
            stationName: "myStation",
            producerName: "tempProducer",
            message: {some: "message"},
            msgId: "42"
        });
    }catch(exception){
        // Handle exception
    }
}
```

To add message headers to the message, use the headers function to create a headers object which you can add headers to. Headers can help with observability when using certain 3rd party to help monitor the behavior of memphis. See [here](https://docs.memphis.dev/memphis/memphis-broker/comparisons/aws-sqs-vs-memphis#observability) for more details.

```typescript
async function produceWithHeaders(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});

        let headers = memphis.headers()
        headers.add("trace_header_example", "track_me_123");

        await memphisConnection.produce({
            stationName: "myStation",
            producerName: "tempProducer",
            message: {some: "message"},
            headers: headers
        });
    }catch(exception){
        // Handle exception
    }
}
```

or:

```typescript
async function produceWithHeaders(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});

        let headers = {trace_header_example, "track_me_123"};

        await memphisConnection.produce({
            stationName: "myStation",
            producerName: "tempProducer",
            message: {some: "message"},
            headers: headers
        });
    }catch(exception){
        // Handle exception
    }
}
```

Lastly, memphis can produce to a specific partition in a station. To do so, use the producerPartitionKey parameter:

```typescript
async function produceWithPartition(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.produce({
            stationName: "myStation",
            producerName: "tempProducer",
            message: {some: "message"},
            producerPartitionKey: "somePartition"
        });
    }catch(exception){
        // Handle exception
    }
}
```

### Produce to multiple stations

Producing to multiple stations can be done by creating a producer with multiple stations and then calling produce on that producer.

```js
const producer = await memphisConnection.producer({
    stationName: ['<station-name>', '<station-name>'],
    producerName: '<producer-name>',
});

await producer.produce({
    message: {some: "message"},
    ackWaitSec: 15,
    producerPartitionKey: "key", 
    producerPartitionNumber: -1 
});
```

Alternatively, it also possible to produce to multiple stations using the connection:

```js
await memphisConnection.produce({
    stationName: ['<station-name>', '<station-name>'],
    producerName: '<producer-name>',
    message: {some: "message"},
    ackWaitSec: 15,
    asyncProduce: true 
});
```

### Destroying a Producer

```js
await producer.destroy();
```

### Creating a Consumer

```js
const consumer = await memphisConnection.consumer({
    stationName: '<station-name>',
    consumerName: '<consumer-name>',
    consumerGroup: '<group-name>', // defaults to the consumer name.
    pullIntervalMs: 1000, // defaults to 1000
    batchSize: 10, // defaults to 10
    batchMaxTimeToWaitMs: 100, // defaults to 100
    maxAckTimeMs: 30000, // defaults to 30000
    maxMsgDeliveries: 2, // defaults to 2
    startConsumeFromSequence: 1, // start consuming from a specific sequence. defaults to 1
    lastMessages: -1, // consume the last N messages, defaults to -1 (all messages in the station)
    consumerPartitionKey: "key", // consume by specific partition key. Defaults to null
    consumerPartitionNumber: -1 // consume by specific partition number. Defaults to -1
});
```

Note:
When consuming from a station with more than one partition, the consumer will consume messages in Round Robin fashion from the different partitions.

Here is an example on how to create a consumer with all of the default options:

```typescript
async function consumerDefualt(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.consumer({
            stationName: "myStation",
            consumerName: "newConsumer"
        });
    }catch(exception){
        // Handle exception
    }
}
```

To create a consumer in a consumer group, add the consumerGroup parameter:

```typescript
async function consumerGroup(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.consumer({
            stationName: "myStation",
            consumerName: "newConsumer",
            consumerGroup: "consumerGroup1"
        });
    }catch(exception){
        // Handle exception
    }
}
```

When using Consumer.consume, the consumer will continue to consume in an infinite loop. To change the rate at which the consumer polls, change the pullIntervalMs parameter:

```typescript
async function consumerPollInterval(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.consumer({
            stationName: "myStation",
            consumerName: "newConsumer",
            pullIntervalMs: 2000
        });
    }catch(exception){
        // Handle exception
    }
}
```

Every time the consumer pulls messages from a station, the consumer will try to take batchSize number of elements from the station. However, sometimes there are not enough messages in the station for the consumer to consume a full batch. In this case, the consumer will continue to wait until either batchSize messages are gathered or the time in milliseconds specified by batchMaxTimeToWaitMs is reached. 

Here is an example of a consumer that will try to pull 100 messages every 10 seconds while waiting up to 15 seconds for all messages to reach the consumer.

```typescript
async function consumerBatched(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.consumer({
            stationName: "myStation",
            consumerName: "newConsumer",
            pullIntervalMs: 10000,
            batchSize: 100,
            batchMaxTimeToWaitMs: 100
        });
    }catch(exception){
        // Handle exception
    }
}
```

The maxMsgDeliveries parameter allows the user how many messages the consumer is able to consume before consuming more. 

```typescript
async function consumerMaxMessages(){
    let memphisConnection;
    try{
        memphisConnection = await memphis.connect({...});
        await memphisConnection.consumer({
            stationName: "myStation",
            consumerName: "newConsumer",
            pullIntervalMs: 10000,
            batchSize: 100,
            batchMaxTimeToWaitMs: 100,
            maxMsgDeliveries: 2
        });
    }catch(exception){
        // Handle exception
    }
}
```

### Passing context to message handlers

```js
consumer.setContext({ key: 'value' });
```

### Processing messages

```js
consumer.on('message', (message, context) => {
    // processing
    console.log(message.getData());
    message.ack();
});
```

#### Processing schema deserialized messages
To get messages deserialized, use `message.getDataDeserialized()`.  

```js
consumer.on('message', (message, context) => {
    // processing
    console.log(message.getDataDeserialized());
    message.ack();
});
```

There may be some instances where you apply a schema *after* a station has received some messages. In order to consume those messages get_data_deserialized may be used to consume the messages without trying to apply the schema to them. As an example, if you produced a string to a station and then attached a protobuf schema, using get_data_deserialized will not try to deserialize the string as a protobuf-formatted message.

### Fetch a single batch of messages

Using fetch_messages or fetch will allow the user to remove a specific number of messages from a given station. This behavior could be beneficial if the user does not want to have a consumer actively poll from a station indefinetly.

```js
const msgs = await memphis.fetchMessages({
    stationName: '<station-name>',
    consumerName: '<consumer-name>',
    consumerGroup: '<group-name>', // defaults to the consumer name.
    batchSize: 10, // defaults to 10
    batchMaxTimeToWaitMs: 100, // defaults to 100
    maxAckTimeMs: 30000, // defaults to 30000
    maxMsgDeliveries: 2, // defaults to 2
    startConsumeFromSequence: 1, // start consuming from a specific sequence. defaults to 1
    lastMessages: -1, // consume the last N messages, defaults to -1 (all messages in the station)
    consumerPartitionKey: "key", // consume by specific partition key. Defaults to null
    consumerPartitionNumber: -1 // consume by specific partition number. Defaults to -1
});
```

### Fetch a single batch of messages after creating a consumer

```js
const msgs = await consumer.fetch({
    batchSize: 10, // defaults to 10
    consumerPartitionKey: "key", // fetch by specific partition key. Defaults to null
    consumerPartitionNumber: -1 // fetch by specific partition number. Defaults to -1
});
```

To set up a connection in nestjs

```js
import { MemphisServer } from 'memphis-dev'

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      strategy: new MemphisServer({
        host: '<memphis-host>',
        username: '<application type username>',
        connectionToken: '<broker-token>'
      }),
    },
  );

  await app.listen();
}
bootstrap();
```

To consume messages in NestJS

```js
export class Controller {
    import { MemphisConsume, Message } from 'memphis-dev';

    @MemphisConsume({
        stationName: '<station-name>',
        consumerName: '<consumer-name>',
        consumerGroup: ''
    })
    async messageHandler(message: Message) {
        console.log(message.getData().toString());
        message.ack();
    }
}
```

### Acknowledge a message

Acknowledge a message indicates the Memphis server to not re-send the same message again to the same consumer/consumers group

```js
message.ack();
```

### Nacking a Message

Mark the message as not acknowledged - the broker will resend the message immediately to the same consumers group, instead of waiting to the max ack time configured.

```js
msg.nack();
```

### Sending a message to the dead-letter

Sending the message to the dead-letter station (DLS) - the broker won't resend the message again to the same consumers group and will place the message inside the dead-letter station (DLS) with the given reason.
The message will still be available to other consumer groups

```js
message.deadLetter("reason");
```

### Delay and resend the message after a given duration

Delay the message and tell the Memphis server to re-send the same message again to the same consumer group. The message will be redelivered only in case `Consumer.maxMsgDeliveries` is not reached yet.

```js
message.delay(delayInMilliseconds);
```

### Get message payload

As Uint8Array

```js
msg = message.getData();
```

As Json

```js
msg = message.getDataAsJson();
```

### Get headers

Get headers per message

```js
headers = message.getHeaders();
```

### Get message sequence number

Get message sequence number

```js
sequenceNumber = message.getSequenceNumber();
```

### Get message sent time

Get the time the message was sent

```js
sentTime = message.getTimeSent();
```


### Catching async errors

```js
consumer.on('error', (error) => {
    // error handling
});
```

### Stopping a Consumer 

Stopping a consumer simply stops it from consuming messages in the code. 

Let's say you don't want listeners of a consumer to receive messages anymore (even if messages are still being produced to its station), stop the consumer and that's it.

```js
await consumer.stop();
```

### Destroying a Consumer

This is different from stopping a consumer. Destroying a consumer destroys it from the station and the broker itself. It won't exist again.

```js
await consumer.destroy();
```

### Check if the broker is connected

```js
memphisConnection.isConnected();
```

### Create memphis instance 

```js
const memphisInstance = createMemphisInstance()
```
