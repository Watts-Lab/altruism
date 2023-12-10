const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: 'ACCESS-KEY',
  secretAccessKey: 'SECRET-KEY',
  region: 'us-east-1'
});

const docClient = new AWS.DynamoDB.DocumentClient();

const assignNewTask = async (workerIDToQuery) => {
  try {
    const workerInfo = await getWorkerInfo(workerIDToQuery);
    if (!workerInfo) {
      return { error: 'Item does not exist', status: 404 };
    }

    let currentTask = null;

    if (workerInfo.completedTasks) {
      const availableTask = await getAvailableTask();
      if (!availableTask) {
        return { error: 'No items found in the table.', status: 404 };
      }

      currentTaskID = availableTask.taskID;
      currentTask = availableTask.taskName;

      await deleteAvailableTask(currentTaskID);
    } else {
      currentTaskID = Date.now().toString() + workerIDToQuery;
      currentTask = 'NewWorkerSurvey';
    }

    await updateWorkerTask(workerIDToQuery, currentTask, currentTaskID);
    return { workerID: workerIDToQuery, assignedTask: currentTask };
  } catch (error) {
    console.error('Error:', error);
    return { error: 'Internal Server Error', status: 500 };
  }
};

const getWorkerInfo = (workerID) => {
  const params = {
    TableName: 'altruism_worker_info',
    Key: {
      'workerID': workerID
    }
  };

  return docClient.get(params).promise().then(data => data.Item).catch(err => {
    console.error('Error getting item:', err);
    throw err;
  });
};

const getAvailableTask = () => {
  const newTaskParams = {
    TableName: 'altruism_available_tasks',
    Limit: 1
  };

  return docClient.scan(newTaskParams).promise().then(data => {
    if (data.Items.length > 0) {
      return data.Items[0];
    }
    return null;
  }).catch(err => {
    console.error('Error scanning DynamoDB table:', err);
    throw err;
  });
};

const deleteAvailableTask = (taskID) => {
  const deleteParams = {
    TableName: 'altruism_available_tasks',
    Key: {
      taskID: taskID,
    },
  };

  return docClient.delete(deleteParams).promise().catch(err => {
    console.error('Error deleting item:', err);
    throw err;
  });
};

const updateWorkerTask = (workerID, currentTask, currentTaskID) => {
  const updateParams = {
    TableName: 'altruism_worker_info',
    Key: {
      workerID: workerID,
    },
    UpdateExpression: 'SET currentTask = :taskValue',
    ExpressionAttributeValues: {
      ':taskValue': docClient.createSet([currentTask, currentTaskID]),
    },
    ReturnValues: 'ALL_NEW',
  };

  return docClient.update(updateParams).promise().then(data => data.Attributes).catch(err => {
    console.error('Error updating item:', err);
    throw err;
  });
};

const updateWorkerInfo = (updateParams) => {
  return docClient.update(updateParams).promise().then(data => {
    return data;
  }).catch(err => {
    console.error('Error updating item:', err);
    throw err;
  });
};

const recordData = (record, workerID, taskID, taskName) => {
  const newRecord = {
    taskID: taskID, 
    workerID: workerID, 
    record: record
  };

  const putParams = {
    TableName: `altruism_${taskName}`,
    Item: newRecord,
  };

  docClient.put(putParams, (err, data) => {
    if (err) {
        console.error('Error adding item:', err);
    } 
  });
}

app.post('/assignNewTask', async (req, res) => {
  const workerIDToQuery = req.body.workerID;
  const result = await assignNewTask(workerIDToQuery);
  return res.status(result.status || 200).json(result.assignedTask);
});

app.post('/getAssignedTask', async (req, res) => {
  try {
    const workerIDToQuery = req.body.workerID;

    if (!workerIDToQuery) {
      return res.status(400).json({ error: 'workerID is required in the request body' });
    }

    const workerInfo = await getWorkerInfo(workerIDToQuery);
    
    if (!workerInfo) {
      return res.status(404).json({ error: 'Item does not exist' });
    }

    const assignedTask = workerInfo.currentTask;
    return res.json({ workerID: workerIDToQuery, assignedTask });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/submitCurrentTask', async (req, res) => {
  try {
    const workerIDToQuery = req.body.workerID;
    if (!workerIDToQuery) {
      return res.status(400).json({ error: 'workerID is required in the request body' });
    }

    const workerInfo = await getWorkerInfo(workerIDToQuery);
    if (!workerInfo) {
      return res.status(404).json({ error: 'Item does not exist' });
    }

    const updateParams = {
      TableName: 'altruism_worker_info',
      Key: {
        workerID: workerIDToQuery
      },
      UpdateExpression: 'SET completedTasks = list_append(if_not_exists(completedTasks, :emptyList), :taskList) REMOVE currentTask',
      ExpressionAttributeValues: {
        ':taskList': [workerInfo.currentTask],
        ':emptyList': []
      },
      ReturnValues: 'ALL_NEW'
    };

    await updateWorkerInfo(updateParams);

    const record = req.body.record; 
    const taskID = workerInfo.currentTask.values[0]
    const taskName = workerInfo.currentTask.values[1]

    await recordData(record, workerIDToQuery, taskID, taskName);

    return res.json({ submittedStatus: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => {
  const data = { message: 'Hello!' };
  res.json(data);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});