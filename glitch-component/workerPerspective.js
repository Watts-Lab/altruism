const fetch = require('node-fetch');
const express = require("express");

const app = express();
const apiUrl = 'https://mck3p05gv0.execute-api.us-east-1.amazonaws.com/cost-treatment';

const AWS = require("aws-sdk");
const region = "us-east-1";
const aws_access_key_id = process.env.YOUR_ACCESS_ID;
const aws_secret_access_key = process.env.YOUR_SECRET_KEY;

AWS.config = {
  accessKeyId: aws_access_key_id,
  secretAccessKey: aws_secret_access_key,
  region: region,
  sslEnabled: "true",
};


var db = new AWS.DynamoDB();

app.use(express.static("public"));
const listener = app.listen(process.env.PORT);
const css = `<head><style type="text/css">
body {
  font: 400 16px / 1.5 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  margin:1rem;
}
a { color: #2c2a2b; text-decoration: none}
a:visited {color: #2c2a2b}
a:hover {
    color: #2c2a2b;
    text-decoration: none;
    background-color: rgba(232, 93, 0, 0.3);
    border-radius: .15rem
}
</style></head>`;

function checkIfPartitionKeyExists(sharerID) {
  return new Promise((resolve, reject) => {
    var params = {
      TableName: 'sharers',
      Key: {
        'workerID': { 'S': sharerID }
      }
    };

    db.getItem(params, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(!!(data && data.Item));
      }
    });
  });
}

app.get("/", async function (request, response) {
  try {
    if (request.query.workerId === undefined) {
      // Viewing inside mturk before accepting
      response.send(`IRB Here !`);
    } else {
      const workerId = request.query.workerId;
      const sharerExists = await checkIfPartitionKeyExists(workerId);

      let responseHTML = `
        <iframe id="myIframe" src="http://localhost:3000/workerID/${request.query.workerId}" width="99%" height="100%" sandbox="allow-same-origin allow-scripts">
        </iframe><br/><br/>`;
      
      let shareCode = "";
      let treatmentType = "";
      
      if (sharerExists) {
        try {
          const requestData = { workerID: request.query.workerId };
          const requestBody = JSON.stringify(requestData);

          const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            body: requestBody,
          });

          if (apiResponse.ok) {
            const data = await apiResponse.json();
            const parsedData = JSON.parse(data.body);
            shareCode = parsedData.shareCode;
            treatmentType = parsedData.treatmentType;
            responseHTML += `
            ${css}
            <div style="background-color: #555; padding: 10px; border-radius: 5px; font-size: 14px; color: white;">
              <div style="font-weight: bold; color: #ffa500; font-size: 16px; margin-bottom: 5px;">Sharing Information</div>
              Complete this HIT by clicking submit below. You may share this HIT with other workers using the share code below. <br /> <br />
              Share Code: ${shareCode} <br /> <br /> 
              ${treatmentType === 'costless' ? 'You may share this task with other workers. Doing so will not reduce the amount of tasks you have remaining.' : 'You may share this task with other workers. Doing so will reduce the amount of tasks you have remaining.'}
            </div>
            <br>
          `;
          } else {
            throw new Error(`POST request failed with status: ${apiResponse.status}`);
          }
        } catch (error) {
          console.error('Error fetching data from API:', error);
          response.status(500).send('Internal Server Error');
          return;
        }
      } 

      responseHTML += `
        <form name='mturk_form' method='post' id='mturk_form' action='${request.query.turkSubmitTo}/mturk/externalSubmit'>
            <input type='hidden' value='${request.query.assignmentId}' name='assignmentId' id='assignmentId' />
            <input type='hidden' value='' name='finishingcode' id='finishingcode' />
            <input type='submit' id='submitButton_finish' value='Submit' style="background-color: #ffa500; color: #555; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;" />
        </form>

        <script>
            document.getElementById('mturk_form').addEventListener('submit', function (event) {
                event.preventDefault();

                var iframe = document.getElementById('myIframe');
                iframe.contentWindow.postMessage('submitForm', '*');
            });

            window.addEventListener('message', function (event) {
                if (event.data.status === 'success') {
                    console.log('Form submitted successfully');
                    document.getElementById('mturk_form').submit();
                } else if (event.data.status === 'error') {
                    console.error('Form submission failed:', event.data.message);
                }
            });
        </script>
      `;

      response.send(responseHTML);
    }
  } catch (error) {
    console.error('Error:', error);
    response.status(500).send('Internal Server Error');
  }
});
