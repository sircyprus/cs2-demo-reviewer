import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Report from './pages/Report.jsx';
import Replay from './pages/Replay.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/demo/:slug" element={<Report />} />
      <Route path="/demo/:slug/replay" element={<Replay />} />
      <Route path="*" element={<div className="page"><p>Page not found. <a href="#/">Back to demos</a></p></div>} />
    </Routes>
  );
}
