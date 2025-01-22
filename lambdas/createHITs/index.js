const s3Service = require('./s3Service');

/*import { ACCESS_ID, SECRET_KEY } from "../../credentials.js";*/
import("../../credentials.js").then(({ ACCESS_ID, SECRET_KEY }) => {

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

/*const sandbox = true; // TRUE FOR SANDBOX - FALSE FOR PROD
const mturkClient = new MTurkClient({
  region,
  endpoint: sandbox
    ? `https://mturk-requester-sandbox.${region}.amazonaws.com`
    : `https://mturk-requester.${region}.amazonaws.com`,
  credentials: { 
    accessKeyId: ACCESS_ID, 
    secretAccessKey: SECRET_KEY
  } 
});

const dynamoDBClient = new DynamoDBClient({ 
  region, 
});

let qualificationTypeId;
const numberOfHITs = 10;*/

const stimuli = [
  { type: "text", content: "Sample text 1", prompt: "Rate this text from 1 to 5" },
  { type: "text", content: "Sample text 2", prompt: "Rate this text from 1 to 5" },
  { type: "text", content: "Sample text 3", prompt: "Rate this text from 1 to 5" },
  { type: "image", content: "https://google.com/image1", prompt: "Rate this image from 1 to 5" },
];

function getTemplate(stimulus) {
  if (stimulus.type === "text") {
    return {
      question: `Please ${stimulus.prompt}`,
      url: `https://example.com/rate-text?content=${encodeURIComponent(stimulus.content)}`
    };
  } else if (stimulus.type === "image") {
    return {
      question: `Please ${stimulus.prompt}`,
      url: `https://example.com/rate-image?content=${encodeURIComponent(stimulus.content)}`
    };
  }
  return null; // For unsupported stimulus types
}

function getRandomStimulus() {
  return stimuli[Math.floor(Math.random() * stimuli.length)];
}

const rewardPerTask = 0.20;
// Define treatment configurations
const treatments = {
  control: {
    numberOfHITs: 10, 
    sandbox: true,
    cost: 0, 
    visibility: "anonymous", 
    timeCost: 10,
    altruism_cost: 0,
    reward: rewardPerTask
  },
  treatmentA: {
    numberOfHITs: 15, 
    sandbox: false,
    cost: 5, 
    visibility: "public", 
    timeCost: 20,
    altruism_cost: 0.3,
    reward: rewardPerTask
  },
  treatmentB: {
    numberOfHITs: 20, 
    sandbox: false,
    cost: 10, 
    visibility: "anonymous", 
    timeCost: 30,
    altruism_cost: 0.5,
    reward: rewardPerTask
  }
};
// how long does all task last (sub-tasks)
// altruism cost (0-1)
// reward per hit

// Choose treatment (you can make this dynamic based on input)
function selectTreatment(workerID) {
  const treatmentNames = Object.keys(treatments);
  return treatments[treatmentNames[Math.floor(Math.random() * treatmentNames.length)]];
}

const selectedTreatment = selectTreatment(workerIdNotif);
const { altruism_cost } = selectedTreatment;

// Initialize MTurkClient with treatment configuration
const mturkClient = new MTurkClient({
  region,
  endpoint: selectedTreatment.sandbox
    ? `https://mturk-requester-sandbox.${region}.amazonaws.com`
    : `https://mturk-requester.${region}.amazonaws.com`,
  credentials: { 
    accessKeyId: ACCESS_ID, 
    secretAccessKey: SECRET_KEY
  }
});

const dynamoDBClient = new DynamoDBClient({ 
  region, 
});

const taskLibrary = [
  "Task1", "Task2", "Task3", // Add actual task identifiers here
  "Task4", "Task5"
];



// Use treatment's number of HITs
const numberOfHITs = selectedTreatment.numberOfHITs;
const hitReward = selectedTreatment.cost;
const hitTime = selectedTreatment.timeCost;
const hitVisibility = selectedTreatment.visibility;


}).catch(err => {
  console.error("Failed to load credentials:", err);
});


const activeHITs = [];
let hitData;

let sns;
let message;
let workerIdNotif;
let shareCodeEntered;

async function getSharerAndTreatment(shareCode) {
  const params = {
    TableName: 'altruism_sharing_data',
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
    TableName: 'altruism_worker_relationships',
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
        TableName: 'altruism_worker_relationships',
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

async function assignDemographicSurvey(workerId) {
    const surveyTask = "DemographicSurvey"; 

    const params = {
        TableName: "worker_info",
        Key: { "workerID": { S: workerId } }
    };

    try {
        const command = new GetItemCommand(params);
        const response = await dynamoDBClient.send(command);

        if (!response.Item || !response.Item.surveyCompleted) {
            await createHIT(workerId, surveyTask);
            
            const updateParams = {
                TableName: "worker_info",
                Item: {
                    "workerID": { S: workerId },
                    "surveyCompleted": { BOOL: true }
                }
            };
            const putCommand = new PutItemCommand(updateParams);
            await dynamoDBClient.send(putCommand);

            console.log(`Assigned demographic survey to worker ${workerId}`);
        } else {
            assignRandomTasks(workerId);
        }
    } catch (error) {
        console.error("Error assigning demographic survey:", error);
    }
}

async function assignRandomTasks(workerId) {
  const shuffledStimuli = stimuli.sort(() => 0.5 - Math.random());
  const maxTasks = Math.floor(shuffledStimuli.length * (1 - altruism_cost));

  for (let i = 0; i < maxTasks; i++) {
    const stimulus = shuffledStimuli[i];
    const template = getTemplate(stimulus);

    if (template) {
      await createHIT(workerId, template.question, template.url);
      console.log(`Assigned task: ${stimulus.type} (${stimulus.content}) to worker ${workerId}`);
    }
  }
}
      
async function createHIT() {
  const stimulus = getRandomStimulus();
  const createHITParams = {
    Title: `Task: ${task} for ${workerIdNotif} - Earn $${selectedTreatment.reward} `,
    Description: `Task ${task} assigned to ${workerIdNotif} for $${selectedTreatment.reward} -- ${selectedTreatment.visibility}`,
    QualificationRequirements: [
    {
      QualificationTypeId: qualificationTypeId,
      Comparator: "Exists",
    }],
    AssignmentDurationInSeconds: 60 * selectedTreatment.timeCost,
    LifetimeInSeconds: 60 * 20,
    Reward: `${selectedTreatment.reward}`,
    Keywords: "question, answer, research, etc",
    MaxAssignments: 1,
    Question: `
    <ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd">
      <ExternalURL>https://example.com/task/${task}</ExternalURL>
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

async function assignTasksToWorker(workerId) {
  const demographicSurveyTask = "DemographicSurvey";

  try {
    // Assign demographic survey first
    await createHIT(workerId, "Complete the demographic survey", "https://example.com/demographic-survey");

    // Assign random tasks
    await assignRandomTasks(workerId);
  } catch (error) {
    console.error("Error assigning tasks:", error);
  }
}
    
async function updateDynamoDB() {
  const getItemParams = {
    TableName: "altruism_worker_info",
    Key: {
      workerID: { S: workerIdNotif },
    },
  };
      
  try {
    const result = await dynamoDBClient.send(new GetItemCommand(getItemParams));
    const existingHITs = result.Item && result.Item.HITs ? result.Item.HITs.L : [];
    const updatedHITs = existingHITs.concat(activeHITs);
        
    const putItemParams = {
      TableName: "altruism_worker_info",
      Item: {
        workerID: { S: workerIdNotif },
        HITs: { L: updatedHITs },
        cost: { N: `${selectedTreatment.cost}` }, 
        visibility: { S: selectedTreatment.visibility } 
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
        Destination: "arn:aws:sns:us-east-1:088838630371:altruism_deleteHITs",
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

function displayAltruismCost() {
  if (selectedTreatment.visibility === "public") {
    console.log(`Altruism Cost for this task: ${altruism_cost * 100}%`);
  } else {
    console.log("Altruism Cost is hidden for this task.");
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
      displayAltruismCost();
      await assignDemographicSurvey(workerId);
      await mapReceiverToSharer(workerIdNotif, shareCodeEntered);
      await createHITsWithQualification(workerIdNotif);

    } catch (error) {
      console.error('Error:', error);
      return { statusCode: 500, body: 'Error' };
    }
  }
};
