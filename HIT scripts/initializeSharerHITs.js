import { ACCESS_ID, SECRET_KEY, DDB_ACCESS_ID, DDB_SECRET_KEY } from "../credentials.js";
import { MTurkClient, 
  CreateHITCommand,
  CreateQualificationTypeCommand, 
  AssociateQualificationWithWorkerCommand,
  UpdateNotificationSettingsCommand
} from "@aws-sdk/client-mturk";
import { DynamoDBClient, 
  GetItemCommand, 
  PutItemCommand, 
} from "@aws-sdk/client-dynamodb";

const region = "us-east-1";
const aws_access_key_id = ACCESS_ID;
const aws_secret_access_key = SECRET_KEY;

const ddb_aws_access_key_id = DDB_ACCESS_ID;
const ddb_aws_secret_access_key = DDB_SECRET_KEY;

const sandbox = true; // TRUE FOR SANDBOX - FALSE FOR PROD
const mturkClient = new MTurkClient({
  region,
  credentials: {
    accessKeyId: aws_access_key_id,
    secretAccessKey: aws_secret_access_key,
  },
  endpoint: sandbox
    ? `https://mturk-requester-sandbox.${region}.amazonaws.com`
    : `https://mturk-requester.${region}.amazonaws.com`,
});

const dynamoDBClient = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: ddb_aws_access_key_id,
    secretAccessKey: ddb_aws_secret_access_key,
  },
});

async function createAndAssignCustomQualification(workerId) {
  const createQualificationParams = {
    Name: `${workerId}Qualification`,
    Description: `Qualifications for ${workerId}`,
    QualificationTypeStatus: "Active",
  };
      
  try {
    const response = await mturkClient.send(new CreateQualificationTypeCommand(createQualificationParams));
    const qualificationTypeId = response.QualificationType.QualificationTypeId;
        
    const assignQualificationParams = {
      QualificationTypeId: qualificationTypeId,
      WorkerId: workerId,
      IntegerValue: 1, 
      SendNotification: false, 
    };
    
    await mturkClient.send(new AssociateQualificationWithWorkerCommand(assignQualificationParams));
    
    return qualificationTypeId;
  } catch (error) {
    throw new Error("Error creating/assigning custom qualification: " + error);
  }
}

async function updateDynamoDB(workerID, activeHITs) {
  const getItemParams = {
    TableName: "altruism_worker_info",
    Key: {
      workerID: { S: workerID },
    },
  };

  try {
    const result = await dynamoDBClient.send(new GetItemCommand(getItemParams));
    const existingHITs = result.Item && result.Item.HITs ? result.Item.HITs.L : [];
    const updatedHITs = existingHITs.concat(activeHITs);

    const putItemParams = {
      TableName: "altruism_worker_info",
      Item: {
        workerID: { S: workerID },
        HITs: { L: updatedHITs },
      },
    };
    await dynamoDBClient.send(new PutItemCommand(putItemParams));

    const putItemParams2 = {
      TableName: "altruism_sharers",
      Item: {
        workerID: { S: workerID },
      },
    }
    await dynamoDBClient.send(new PutItemCommand(putItemParams2));

    console.log(`Updated DynamoDB for Worker ID ${workerID}.`);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function updateNotificationSettings(HITId) {
  try {
    const notificationParams = {
      HITTypeId: HITId, 
      Notification: {
        Destination: "arn:aws:sns:us-east-1:451348143162:MTurk2-Delete_HITs_sharer",
        Transport: "SNS",
        Version: "2014-08-15",
        EventTypes: ["AssignmentSubmitted"],
      },
      Active: true,
    };
    await mturkClient.send(new UpdateNotificationSettingsCommand(notificationParams));
  } catch (error) {
    console.error("Error: ", error);
  }
}

async function createHITs(workerIDs) {
  const numHITs = 5; // TO-DO: CHANGE THIS TO NUMBER OF HITS FOR EACH SHARER

  for (const workerID of workerIDs) {
    const activeHITs = [];

    const qualificationID = await createAndAssignCustomQualification(workerID);
    const HIT_params_list = Array.from({ length: numHITs }, () => ({
      AssignmentDurationInSeconds: 60 * 10, // TO-DO: CHANGE PARAMETERS
      Description: `HITs for ${workerID} -- Sharer`,
      LifetimeInSeconds: 60 * 20,
      Reward: "0.01",
      Title: `HITs for ${workerID}`,
      Keywords: "question, answer, research, etc",
      MaxAssignments: 1,
      QualificationRequirements: [
        {
          QualificationTypeId: qualificationID,
          Comparator: "Exists",
        }
      ],
      Question: `
          <ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd">
            <ExternalURL>https://altruism-receiver-perspective.glitch.me/</ExternalURL>
            <FrameHeight>400</FrameHeight>
          </ExternalQuestion>
        `,
    }));

    for (const HIT of HIT_params_list) {
      try {
        const data = await mturkClient.send(new CreateHITCommand(HIT));
        activeHITs.push({ S: data.HIT.HITId })
        await updateNotificationSettings(data.HIT.HITTypeId)
        let hitURL = `https://${sandbox ? "workersandbox" : "worker"}.mturk.com/projects/${data.HIT.HITTypeId}/tasks`;
        console.log("\nA task was created at:", hitURL);
      } catch (err) {
        console.log(err, err.stack);
      }
    }
    await updateDynamoDB(workerID, activeHITs);
  }
}

const workerIDs = ["A3FLICAK428301"]
createHITs(workerIDs)