import React, { useEffect, useState } from 'react';
import Task from './Task';

const Main = ({ workerID }) => {
    const [task, setTask] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const getAssignedTask = async () => {
            try {
                let response = await fetch('http://localhost:3001/getAssignedTask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ workerID: workerID }),
                });
                let data = await response.json();
                if (data.assignedTask) {
                    setTask(data.assignedTask[1])
                } else { 
                    response = await fetch('http://localhost:3001/assignNewTask', {
                        method: 'POST',
                        headers: {
                        'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ workerID: workerID }),
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    const data = await response.json();
                    setTask(data.taskName);
                }
            } catch (error) {
                console.error('Error fetching random item:', error);
            }
        };
        getAssignedTask();
    }, [task]);

    const submitTask = async (record) => {
        try {
            const response = await fetch('http://localhost:3001/submitCurrentTask', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workerID: workerID,
                    record: record
                }),
            });
        
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const status = await response.json();
            setSubmitted(status)
        } catch (error) {
            console.error('Error making DynamoDB update request:', error);
        }
    };

    return (
        submitted ? 
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh', 
            textAlign: 'center',
            padding: '20px',
            border: '1px solid #ccc'
        }}>
            <p> Submitted! </p>
        </div>
        : 
        <div style={{ textAlign: 'center', margin: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px' }}>
                <p style={{ color: '#555' }}>Worker ID: {workerID}</p>
                <p style={{ color: '#555' }}>{task}</p>
            </div>
            <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', margin: '10px 0' }}>
                <Task submitCallback={submitTask} taskType={task} />
            </div>
        </div>
    );
};

export default Main;