## Sharing Workflow  

### Overview 

Workflow to create and process HITs for the sharer: 
<img width="1095" alt="Screenshot 2023-12-07 at 1 46 29 PM" src="https://github.com/kailyl/altruism-docs/assets/59887357/04ca27c1-38f5-4320-b26d-6071ceb5a52e">

Workflow to create and process HITs for the receiver: 

<img width="995" alt="Screenshot 2023-12-07 at 1 05 02 PM" src="https://github.com/kailyl/altruism-docs/assets/59887357/ac93035a-0a40-4ff1-afe2-820365110eef">

### Functions
#### Local Scripts 
Programs executed to generate the HITs and initiate a cycle of the experiment.

<img width="450" alt="Screenshot 2023-12-07 at 1 13 19 PM" src="https://github.com/kailyl/altruism-docs/assets/59887357/7b53f62b-311a-4689-b676-88fa497f0f51">

#### Lambda Functions 
Functions that are called when a worker submits or accepts a HIT. Used to run calls to DynamoDB and MTurk. 

<img width="910" alt="Screenshot 2023-12-07 at 1 51 18 PM" src="https://github.com/kailyl/altruism-docs/assets/59887357/c78f2e9a-37d0-41e4-a1c2-e03bc424befd">

#### Simple Notification Service 
Messages that are triggered when a worker submits a HIT. Call lambda functions (above) with the matching name. 

<img width="650" alt="Screenshot 2023-12-07 at 1 55 22 PM" src="https://github.com/kailyl/altruism-docs/assets/59887357/8751f1a9-01b7-4bf4-936a-dc65b4aab0bb">

#### API Gateway
Calls triggered when a worker accepts a HIT. Calls lambda functions (above) with the matching name. 

<img width="220" alt="Screenshot 2023-12-07 at 1 58 18 PM" src="https://github.com/kailyl/altruism-docs/assets/59887357/c08a1b36-00a5-4306-ae3c-0383f3d7f9b8">

### Database Schema 
<img width="750" alt="Screenshot 2023-12-07 at 2 00 07 PM" src="https://github.com/kailyl/altruism-docs/assets/59887357/6345f806-b2dc-4777-8fd2-de99a88cb500">

## Task Data Collection Workflow  
### Overview
Flow for displaying a survey/task to the worker, then processing the inputs when submitted. 
<img width="1000" alt="Screenshot 2023-12-07 at 2 58 13 PM" src="https://github.com/kailyl/altruism-docs/assets/59887357/8c38fce6-54b4-4934-9115-44a1158c4b65">

### Database Schema
<img width="550" alt="image" src="https://github.com/kailyl/altruism-docs/assets/59887357/0fa5f364-430b-40b1-b2ba-f8a2357a46a6">