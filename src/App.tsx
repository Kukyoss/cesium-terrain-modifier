import React from 'react';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import CesiumPage from './pages/cesium';

function App() {
	return (
		<div className="App">
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<CesiumPage />} />
				</Routes>
			</BrowserRouter>
		</div>
	);
}

export default App;
