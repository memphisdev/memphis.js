import { memphis, Memphis } from 'memphis-dev';

(async function () {
    let memphisConnection: Memphis;

    try {    
        memphisConnection = await memphis.connect({
            host: "<memphis-host>",
            username: "<memphis-username>", // (root/application type user)
            accountId: <memphis-accountId/>, //You can find it on the profile page in the Memphis UI. This field should be sent only on the cloud version of Memphis, otherwise it will be ignored
            password: "<memphis-password>"
        });
    
        let producer = await memphis.producer({
            stationName: "<station-name>",
            producerName: "<producer-name>"
        });
    
        for (let i = 0; i < 4; i++){
            await producer.produce({
                message: {
                    "Hello": "World"
                }
            });
        }
    
        memphisConnection.close()
    } catch (ex) {
        console.log(ex);
        if (memphisConnection) memphisConnection.close();
    }
})();
