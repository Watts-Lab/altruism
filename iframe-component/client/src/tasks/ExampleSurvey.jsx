import React, { useEffect, useRef, useState } from 'react';
import { ExampleSurvey } from "@watts-lab/surveys";

const ExampleSurveyComponent = ({ submitCallback }) => {
    const [event, setEvent] = useState(null);
    const isEventReceived = useRef(false);

    useEffect(() => {
        const hideCompleteButton = () => {
            const completeButton = document.querySelector('.sv-footer__complete-btn');
            if (completeButton) {
                completeButton.style.display = 'none';
            }
        };

        const intervalId = setInterval(hideCompleteButton, 100);

        const handleMessage = (event) => {
            if (event.data === 'submitForm') {
                hideCompleteButton();
                const completeButton = document.querySelector('.sv-footer__complete-btn');
                if (completeButton) {
                    completeButton.click();
                    setEvent(event);
                    isEventReceived.current = true;
                    console.log("Event received:", event);
                }
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            clearInterval(intervalId);
            const completeButton = document.querySelector('.sv-footer__complete-btn');
            if (completeButton) {
                completeButton.style.display = 'block';
            }
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    useEffect(() => {
        // Check for the event in this useEffect
        if (isEventReceived.current && event) {
            const responseData = { status: 'success', message: 'Form submission successful' };
            event.source.postMessage(responseData, event.origin);
        }
    }, [event]);

    const handleSurveyComplete = (record) => {
        submitCallback(record);
        // No need to check for the event here, the second useEffect will handle it
    };

    return (
        <div>
            <ExampleSurvey onComplete={handleSurveyComplete} />
        </div>
    );
}

export default ExampleSurveyComponent;
