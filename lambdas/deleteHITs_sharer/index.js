import { ACCESS_ID, SECRET_KEY } from "../../credentials.js";
const { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { MTurkClient, UpdateExpirationForHITCommand, GetHITCommand } = require('@aws-sdk/client-mturk');

exports.handler = async (event, context) => {
    const region = 'us-east-1';

    const mturk = new MTurkClient({ 
        region: region, 
        endpoint: 'https://mturk-requester-sandbox.us-east-1.amazonaws.com',
        credentials: { 
            accessKeyId: ACCESS_ID, 
            secretAccessKey: SECRET_KEY
        } 
    });

    const db = new DynamoDBClient({ 
        region: region, 
    });

    async function deleteHITs(sharerID) {
        const params = {
            TableName: 'altruism_worker_info',
            Key: {
                workerID: { S: sharerID },
            },
        };

        try {
            const data = await db.send(new GetItemCommand(params));
            let HITs = data.Item.HITs.L;
            const lastHIT = HITs.pop().S;
            console.log(HITs)
            try {
                await mturk.send(new UpdateExpirationForHITCommand({ HITId: lastHIT, ExpireAt: new Date(0) }));
            } catch (updateError) {
                console.error('Error in UpdateExpirationForHITCommand:', updateError);
                throw updateError;
            }

            const updateParams = {
                TableName: 'altruism_worker_info',
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
            TableName: 'altruism_worker_relationships',
            IndexName: 'sharerWorkerID-index',
            KeyConditionExpression: `sharerWorkerID = :value`,
            ExpressionAttributeValues: {
                ':value': { S: sharerID }
            }
        };

        try {
            const data = await db.send(new QueryCommand(params));
            let workerIDs = []
            if (data && data.Items) {
                for (const worker of data.Items) {
                    if (worker.treatment.S === "costful") {
                        workerIDs.push(worker.receiverWorkerID.S)
                    }
                }
            }
            return workerIDs;
        } catch (error) {
            console.error('Error', error);
            throw error;
        }
    }

    async function isSharerDeleteHITs(sharerID) {
        try {
            const otherWorkersInGroup = await getOtherWorkersInGroup(sharerID);
            for (const otherWorkerID of otherWorkersInGroup) {
                if (otherWorkerID !== sharerID) {
                    await deleteHITs(otherWorkerID);
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
            await isSharerDeleteHITs(workerId);
            return { statusCode: 200, body: 'Worked!' };
        } catch (error) {
            console.error('Error:', error);
            return { statusCode: 500, body: 'Error' };
        }
    }
};