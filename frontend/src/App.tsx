import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import islaLogo from './assets/isla-logo.png';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <header>
          <img src={islaLogo} alt="ISLA Instruments" className="logo" />
          <h1>S2400 Plugin Creator (BETA)</h1>
          <p className="subtitle">Convert your SoundFont (.sf2) files into LV2 plugins</p>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<FileUpload />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
