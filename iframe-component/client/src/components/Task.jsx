import React from 'react';
import DemographicSurvey from '../tasks/DemographicsSurvey';
import ExampleSurvey from '../tasks/ExampleSurvey';

const Task = ({ submitCallback, taskType }) => {
    return (
        taskType === "NewWorkerSurvey" ? 
        <div>
            <DemographicSurvey submitCallback={submitCallback}/>
        </div> :
        taskType === "ExampleTask" ?
        <div>
            <ExampleSurvey submitCallback={submitCallback}/>
        </div> :
        <p> No Matching Task </p>
    )
}

export default Task