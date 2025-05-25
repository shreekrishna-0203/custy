import React from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MeetingRoom from "./pages/MeetingRoom";
import Summarize from './pages/Summarize';

const queryClient = new QueryClient();

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/loginpage" element={<Login />} />
          <Route path="/registerpage" element={<Register />} />
          <Route path="/meetingpage" element={<MeetingRoom />} />
          <Route path="/summarizer" element={<Summarize />} />
        </Routes>
      </BrowserRouter>
  </QueryClientProvider>
);

export default App;