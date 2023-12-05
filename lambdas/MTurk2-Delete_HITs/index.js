const { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { MTurkClient, UpdateExpirationForHITCommand, GetHITCommand } = require('@aws-sdk/client-mturk');

exports.handler = async (event, context) => {
    const region = 'us-east-1';

    const mturk = new MTurkClient({ 
        region: region, 
        endpoint: 'https://mturk-requester-sandbox.us-east-1.amazonaws.com',
    });

    const db = new DynamoDBClient({ 
        region: region, 
    });

    async function deleteHITs(sharerID) {
        const params = {
            TableName: 'worker_info',
            Key: {
                workerID: { S: sharerID },
            },
        };

        try {
            const data = await db.send(new GetItemCommand(params));
            let HITs = data.Item.HITs.L;
            const lastHIT = HITs.pop().S;
            
            try {
                await mturk.send(new UpdateExpirationForHITCommand({ HITId: lastHIT, ExpireAt: new Date(0) }));
            } catch (updateError) {
                console.error('Error in UpdateExpirationForHITCommand:', updateError);
                throw updateError;
            }

            const updateParams = {
                TableName: 'worker_info',
                Item: {
                    workerID: { S: sharerID },
                    HITs: { L: HITs },
                },
            };
            await db.send(new PutItemCommand(updateParams));
            return;
        } catch (error) {
            console.error('Error', error);
            throw error;
        }
    }

    async function getOtherWorkersInGroup(sharerID) {
        const params = {
            TableName: 'worker_relationships',
            IndexName: 'sharerWorkerID-index',
            KeyConditionExpression: `sharerWorkerID = :value`,
            ExpressionAttributeValues: {
                ':value': { S: sharerID }
            }
        };

        try {
            const data = await db.send(new QueryCommand(params));
            let workerIDs = []
            for (const worker of data.Items) {
                workerIDs.push(worker.receiverWorkerID.S)
            }
            return workerIDs;
        } catch (error) {
            console.error('Error', error);
            throw error;
        }
    }

    async function mapToSharer(workerID) {
        const params = {
            TableName: 'worker_relationships',
            Key: {
                receiverWorkerID: { S: workerID },
            },
        };

        try {
            const data = await db.send(new GetItemCommand(params));
            const treatment = data.Item.treatment.S;
            const sharerID = data.Item.sharerWorkerID.S;
            if (treatment === 'costful') {
                await deleteHITs(sharerID);
                const otherWorkersInGroup = await getOtherWorkersInGroup(sharerID);
                for (const otherWorkerID of otherWorkersInGroup) {
                    if (otherWorkerID !== workerID) {
                        await deleteHITs(otherWorkerID);
                    }
                }
            }
            return 'Success';
        } catch (error) {
            console.error('Error', error);
            throw error;
        }
    }

    for (const record of event.Records) {
        const sns = record.Sns;
        const message = JSON.parse(sns.Message);
        const workerId = message.Events[0].WorkerId;
        try {
            await mapToSharer(workerId);
            return { statusCode: 200, body: 'Worked!' };
        } catch (error) {
            console.error('Error:', error);
            return { statusCode: 500, body: 'Error' };
        }
    }
};