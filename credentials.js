import dotenv from 'dotenv';
dotenv.config();

// Retrieve credentials from environment variables
const ACCESS_ID = process.env.ACCESS_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const DDB_ACCESS_ID = process.env.DDB_ACCESS_ID;
const DDB_SECRET_KEY = process.env.DDB_SECRET_KEY;

// Export variables for use in other files with ES module syntax
export const AWS_CONSOLE_URL = "https://aws-seas-wattslab-acct.signin.aws.amazon.com/console";
export { ACCESS_ID, SECRET_KEY, DDB_ACCESS_ID, DDB_SECRET_KEY };

