## Sharing Workflow  

### Overview 

Workflow to create and process HITs for the sharer: 
<img width="1095" alt="288860636-04ca27c1-38f5-4320-b26d-6071ceb5a52e" src="https://github.com/Watts-Lab/altruism/assets/59887357/f2bfab6a-e658-4fba-bedb-09615016f1e3">

Workflow to create and process HITs for the receiver: 
<img width="995" alt="288850354-ac93035a-0a40-4ff1-afe2-820365110eef" src="https://github.com/Watts-Lab/altruism/assets/59887357/3a9eb6e0-7718-478d-aa19-4b3ffa9eb504">

### Functions
#### Local Scripts 
Programs executed to generate the HITs and initiate a cycle of the experiment.
<img width="450" alt="288852262-7b53f62b-311a-4689-b676-88fa497f0f51" src="https://github.com/Watts-Lab/altruism/assets/59887357/01063105-d8d6-4e3f-8d94-b8e8660d8326">

#### Lambda Functions 
Functions that are called when a worker submits or accepts a HIT. Used to run calls to DynamoDB and MTurk. 
<img width="910" alt="288862228-c78f2e9a-37d0-41e4-a1c2-e03bc424befd" src="https://github.com/Watts-Lab/altruism/assets/59887357/92cafe95-5035-4504-89f7-c240f940d990">

#### Simple Notification Service 
Messages that are triggered when a worker submits a HIT. Call lambda functions (above) with the matching name. 
<img width="650" alt="288863159-8751f1a9-01b7-4bf4-936a-dc65b4aab0bb" src="https://github.com/Watts-Lab/altruism/assets/59887357/84df2686-176a-4f1b-af79-5180b8b04478">

#### API Gateway
Calls triggered when a worker accepts a HIT. Calls lambda functions (above) with the matching name. 

<img width="220" alt="288864333-c08a1b36-00a5-4306-ae3c-0383f3d7f9b8" src="https://github.com/Watts-Lab/altruism/assets/59887357/0745c3df-c557-493f-8149-f6f29f0cdccf">

### Database Schema 
<img width="750" alt="288864961-6345f806-b2dc-4777-8fd2-de99a88cb500" src="https://github.com/Watts-Lab/altruism/assets/59887357/6b13f66f-e0e9-45a0-b523-5d2d20ee9210">

## Task Data Collection Workflow  
### Overview
Flow for displaying a survey/task to the worker, then processing the inputs when submitted. 
<img width="1000" alt="288877988-8c38fce6-54b4-4934-9115-44a1158c4b65" src="https://github.com/Watts-Lab/altruism/assets/59887357/46d7270b-a83a-461d-a896-619a4602730c">


### Database Schema
<img width="550" alt="288872131-0fa5f364-430b-40b1-b2ba-f8a2357a46a6" src="https://github.com/Watts-Lab/altruism/assets/59887357/4c1df78d-193f-4629-b2c7-9088cdb5889f">
