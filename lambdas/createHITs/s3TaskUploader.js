const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: "us-east-1" });
const bucketName = "edu-upenn-wattslab-task-data";
const tasksPrefix = "tasks/";

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

// Example usage
const exampleTask = {
    id: "task1",
    description: "Rate this image from 1 to 5.",
    stimulus: "https://example.com/image.jpg",
};

uploadTask(exampleTask, exampleTask.id);
