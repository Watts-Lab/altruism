const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Readable } = require("stream");

const s3 = new S3Client({ region: "us-east-1" });
const bucketName = "edu-upenn-wattslab-task-data";
const tasksPrefix = "tasks/";

/**
 * Upload a task to S3
 * @param {Object} task - Task object to upload
 * @param {string} taskId - Unique task ID
 */
async function uploadTask(task, taskId) {
    const key = `${tasksPrefix}${taskId}.json`;
    const params = {
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(task),
        ContentType: "application/json",
    };

    try {
        const data = await s3.send(new PutObjectCommand(params));
        console.log(`Task uploaded successfully: ${key}`);
        return data;
    } catch (err) {
        console.error("Error uploading task:", err);
        throw err;
    }
}

/**
 * List all tasks stored in the S3 bucket
 * @returns {Array<string>} - List of task keys
 */
async function listTasks() {
    const params = {
        Bucket: bucketName,
        Prefix: tasksPrefix,
    };

    try {
        const data = await s3.send(new ListObjectsV2Command(params));
        if (!data.Contents || data.Contents.length === 0) {
            console.log("No tasks found in the S3 bucket.");
            return [];
        }
        return data.Contents.map((item) => item.Key);
    } catch (err) {
        console.error("Error listing tasks:", err);
        throw err;
    }
}

/**
 * Retrieve a specific task from S3
 * @param {string} taskKey - Key of the task to retrieve
 * @returns {Object} - Parsed task object
 */
async function getTask(taskKey) {
    const params = {
        Bucket: bucketName,
        Key: taskKey,
    };

    try {
        const data = await s3.send(new GetObjectCommand(params));
        const stream = Readable.from(data.Body);
        let result = "";
        for await (const chunk of stream) {
            result += chunk;
        }
        return JSON.parse(result);
    } catch (err) {
        console.error("Error retrieving task:", err);
        throw err;
    }
}

// Example usage for testing
(async () => {
    try {
        // List tasks
        const taskKeys = await listTasks();
        console.log("Available tasks:", taskKeys);

        // Retrieve and display the first task
        if (taskKeys.length > 0) {
            const task = await getTask(taskKeys[0]);
            console.log("Retrieved task:", task);
        }

        // Example of uploading a task
        const exampleTask = {
            id: "example-task",
            description: "Rate this image from 1 to 5.",
            stimulus: "https://example.com/image.jpg",
        };
        await uploadTask(exampleTask, exampleTask.id);
    } catch (err) {
        console.error("Error during task operations:", err);
    }
})();
