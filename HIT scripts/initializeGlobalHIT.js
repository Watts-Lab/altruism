import { ACCESS_ID, SECRET_KEY } from "../credentials.js";
import { MTurkClient, CreateHITCommand, UpdateNotificationSettingsCommand } from "@aws-sdk/client-mturk";

const region = "us-east-1";
const aws_access_key_id = ACCESS_ID;
const aws_secret_access_key = SECRET_KEY;

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

const hitParams = {
    AssignmentDurationInSeconds: 60 * 10, // TO-DO: CHANGE PARAMETERS
    Description: "description here",
    LifetimeInSeconds: 60 * 1,
    Reward: "0.01",
    Title: "Global Share HIT",
    AutoApprovalDelayInSeconds: 1,
    Keywords: "question, answer, research, etc",
    MaxAssignments: 20,
    HITLayoutId: "3X4TN5GASVGRQ02IK479BM677ICW8S", 
}

const notificationParams = {
    HITTypeId: "", 
    Notification: {
      Destination: "arn:aws:sns:us-east-1:451348143162:MTurk",
      Transport: "SNS",
      Version: "2014-08-15",
      EventTypes: ["AssignmentSubmitted"],
    },
    Active: true,
};

try {
    const hitData = await mturkClient.send(new CreateHITCommand(hitParams));
    notificationParams.HITTypeId = hitData.HIT.HITTypeId;
    await mturkClient.send(new UpdateNotificationSettingsCommand(notificationParams));

    let hitURL = `https://${sandbox ? "workersandbox" : "worker"}.mturk.com/projects/${hitData.HIT.HITTypeId}/tasks`;
    console.log("\nA task was created at:", hitURL);
} catch (err) {
    console.log(err, err.stack);
}