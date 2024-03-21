import React from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route, 
	useParams
} from "react-router-dom";
import Main from './components/Main';

const WorkerRoute = () => {
	const { workerID } = useParams();
	return <Main workerID={workerID} />;
};  


function App() {
  return (
		<>
			<Router>
				<Routes>
					<Route path="/workerID/:workerID" element={<WorkerRoute />} />
 				</Routes>
			</Router>
		</>
	);
}

export default App;
