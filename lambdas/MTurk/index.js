const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { parseString } = require('xml2js');
const {
  MTurkClient,
  CreateHITCommand,
  AssociateQualificationWithWorkerCommand,
  CreateQualificationTypeCommand,
  UpdateNotificationSettingsCommand
} = require('@aws-sdk/client-mturk');

const region = "us-east-1";

const sandbox = true; // TRUE FOR SANDBOX - FALSE FOR PROD
const mturkClient = new MTurkClient({
  region,
  endpoint: sandbox
    ? `https://mturk-requester-sandbox.${region}.amazonaws.com`
    : `https://mturk-requester.${region}.amazonaws.com`,
});

const dynamoDBClient = new DynamoDBClient({ 
  region, 
});

let qualificationTypeId;
const numberOfHITs = 10;
const activeHITs = [];
let hitData;

let sns;
let message;
let workerIdNotif;
let shareCodeEntered;

async function getSharerAndTreatment(shareCode) {
  const params = {
    TableName: 'sharing_data',
    Key: {
      "shareID": { S: shareCode },
    },
    ProjectionExpression: "sharerWorkerID, treatment",
  };
      
  try {
    const command = new GetItemCommand(params);
    const response = await dynamoDBClient.send(command);
    if (response.Item) {
      return [response.Item.treatment.S, response.Item.sharerWorkerID.S];
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}


async function mapWorkers(receiverWorkerID, sharerWorkerID, treatment) {
  const params = {
    TableName: 'worker_relationships',
    Key: {
      "receiverWorkerID": { S: receiverWorkerID },
    },
  };
      
  try {
    const command = new GetItemCommand(params);
    const response = await dynamoDBClient.send(command);
    if (response.Item) {
      throw "Worker is already matched with a sharer";
    } else {
      const putParams = {
        TableName: 'worker_relationships',
        Item: {
          'receiverWorkerID': { S: receiverWorkerID },
          'sharerWorkerID': { S: sharerWorkerID },
          'treatment': { S: treatment },
        },
      };
      const putCommand = new PutItemCommand(putParams);
      await dynamoDBClient.send(putCommand);
      return;
    }
  } catch (error) {
    throw error;
  }
}

async function mapReceiverToSharer(workerIdNotif, shareCodeEntered) {
  const workerID = workerIdNotif; 
  const shareCode = shareCodeEntered;

  try {
    const sharerAndTreatment = await getSharerAndTreatment(shareCode);
    if (sharerAndTreatment) {
      const [treatment, sharerID] = sharerAndTreatment;
      if (workerID !== sharerID) {
        await mapWorkers(workerID, sharerID, treatment);
      } else {
        throw new Error('Receiver and sharer cannot be the same worker')
      }
    } else {
      throw new Error("Share code not found")
    }
  } catch (error) {
    throw new Error("Error: " + error)
  }
}

async function createAndAssignCustomQualification(workerId) {
  const createQualificationParams = {
    Name: `${workerId}Qualification`,
    Description: `Qualifications for ${workerId}`,
    QualificationTypeStatus: "Active",
  };
      
  try {
    const response = await mturkClient.send(new CreateQualificationTypeCommand(createQualificationParams));
    qualificationTypeId = response.QualificationType.QualificationTypeId;
        
    const assignQualificationParams = {
      QualificationTypeId: qualificationTypeId,
      WorkerId: workerId,
      IntegerValue: 1, 
      SendNotification: false, 
    };
    
    await mturkClient.send(new AssociateQualificationWithWorkerCommand(assignQualificationParams));
  } catch (error) {
    throw new Error("Error creating/assigning custom qualification: " + error);
  }
}
      
async function createHIT() {
  const createHITParams = {
    Title: `HITs for ${workerIdNotif}`,
    Description: `HITs for ${workerIdNotif} -- Receiver`,
    QualificationRequirements: [
    {
      QualificationTypeId: qualificationTypeId,
      Comparator: "Exists",
    }],
    AssignmentDurationInSeconds: 60 * 10, // TO-DO: CHANGE PARAMETERS
    LifetimeInSeconds: 60 * 20,
    Reward: "0.01",
    Keywords: "question, answer, research, etc",
    MaxAssignments: 1,
    Question: `
    <ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd">
      <ExternalURL>https://altruism-receiver-perspective.glitch.me/</ExternalURL>
      <FrameHeight>400</FrameHeight>
    </ExternalQuestion>
    `,
  };
      
  try {
    hitData = await mturkClient.send(new CreateHITCommand(createHITParams));
    activeHITs.push({ S: hitData.HIT.HITId })
            
    let hitURL = `https://${sandbox ? "workersandbox" : "worker"}.mturk.com/projects/${hitData.HIT.HITTypeId}/tasks`;
    console.log("\nA task was created at:", hitURL);
  } catch (error) {
    throw new Error("Error: " + error);
  }
}
    
async function updateDynamoDB() {
  const getItemParams = {
    TableName: "worker_info",
    Key: {
      workerID: { S: workerIdNotif },
    },
  };
      
  try {
    const result = await dynamoDBClient.send(new GetItemCommand(getItemParams));
    const existingHITs = result.Item && result.Item.HITs ? result.Item.HITs.L : [];
    const updatedHITs = existingHITs.concat(activeHITs);
        
    const putItemParams = {
      TableName: "worker_info",
      Item: {
        workerID: { S: workerIdNotif },
        HITs: { L: updatedHITs },
      },
    };
      
    await dynamoDBClient.send(new PutItemCommand(putItemParams));
    console.log(`Updated DynamoDB for Worker ID ${workerIdNotif}.`);
  } catch (error) {
    throw new Error("Error: " + error);
  }
}
    
async function createHITsWithQualification(workerId) {
  await createAndAssignCustomQualification(workerId);
  for (let i = 0; i < numberOfHITs; i++) {
    await createHIT();
  }
  await updateDynamoDB();
    
  try {
    const notificationParams = {
      HITTypeId: hitData.HIT.HITTypeId, 
      Notification: {
        Destination: "arn:aws:sns:us-east-1:451348143162:MTurk2-Delete_HITs",
        Transport: "SNS",
        Version: "2014-08-15",
        EventTypes: ["AssignmentSubmitted"],
      },
      Active: true,
    };
    await mturkClient.send(new UpdateNotificationSettingsCommand(notificationParams));
  } catch (error) {
    throw new Error("Error: " + error);
  }
}

exports.handler = async (event, context) => {
  await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second wait to account for HIT status
  for (const record of event.Records) {
    sns = record.Sns;
    message = JSON.parse(sns.Message);
    workerIdNotif = message.Events[0].WorkerId;
    HITId = message.Events[0].HITId;
    
    parseString(message.Events[0].Answer, (err, result) => {
      if (err) {
        throw new Error("Error: " + err);
      } else {
        shareCodeEntered = result.QuestionFormAnswers.Answer[0].FreeText[0];
      }
    });

    try {
      await mapReceiverToSharer(workerIdNotif, shareCodeEntered);
      await createHITsWithQualification(workerIdNotif);

    } catch (error) {
      console.error('Error:', error);
      return { statusCode: 500, body: 'Error' };
    }
  }
};