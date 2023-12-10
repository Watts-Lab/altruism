### A Field Study of Human Prosocial Behavior Using an Online Labor Market

#### Background
Through an independent study, I studied how individuals act pro-socially on Amazon’s Mechanical Turk (MTurk) labor market by implementing a workflow used to investigate how MTurk workers share information about available jobs for pay (HITs). 

#### Research Question
Historically, research that studies human prosocial behavior has been based on artificial in-lab experiments that abstract real-world situations. However, because these approaches are studied in a lab setting, it is unknown how these theories on human behavior can be generalized to settings outside the lab, or if the findings are even ecologically valid. Specifically, individuals in these experiments may act differently due to: 

* Awareness of scrutiny from other individuals.
* A lack of anonymity in the experiment.
* Artificially abstracted settings are vulnerable to framing effects. 
* Social dynamics of the real-world are complicated and cannot be abstracted in lab experiments. 

Conducted as a field study on MTurk, this project aims to overcome these issues and measure the degree in which humans spontaneously behave pro-socially. This project will measure the tendency for individuals to share HITs as an index of behaving pro-socially by determining differences in behavior caused by various treatment conditions. 

#### Objective 
The focus of my independent study was to design and implement the experimental platform to be used by the study. 

First, I investigated how to build the participant experience so that it produces clean results and does not interfere with the Mechanical Turk community. Then, I built the recruitment interface for generating HITs, assigning workers to treatments, sharing assignments between workers, and storing and processing data using a NodeJS stack. 

#### Milestones/Timeline 
* **Week 1 - 2:** Reviewing documents from previous study attempts. Developing a comprehensive understanding of the Mechanical Turk interface from both worker and requester perspectives. Brainstorming possible workflows around MTurk interface. 
* **Week 3 - 4:** Exploring MTurk Requester API. Understanding how to create and expire HITs, assign qualifications to specific workers, and structure assignments. Reading documentation on how to trigger creation of HITs using AWS Lambda and API Gateway. 
* **Week 5 - 7:** Finalizing the workflow. Writing code locally to create and store the sharer HITs, initialize the receiver HITs, and expire HITs. 
* **Week 8 - 9:** Uploading code/calls to AWS Lambda, SNS, API Gateway. Testing triggers and dataflow. 
* **Week 10 - 11:** Debugging and testing storage system. Updating expiration flow. 
* **Week 12 - 14:** Working on building the iFrame component to serve tasks/surveys to the worker and store data.
* **Week 15:** Finalizing workflow between MTurk and iFrame component. Documenting pipelines.

#### Solution
* [Overview](https://github.com/Watts-Lab/altruism/blob/main/documentation%20(kaily%20indep%20study)/methods.md)
* [Design Document](https://github.com/Watts-Lab/altruism/blob/main/documentation%20(kaily%20indep%20study)/design-doc.md)
