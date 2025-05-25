import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

export default function Login() {
  const [userEmail, sUserEmail] = useState('');
  const [userPass, sUserPass] = useState('');
  const [isLoading, sIsLoading] = useState(false);
  const nav = useNavigate();

  const loginHandler = async(event:React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();   

    sIsLoading(true); 

    const loginResult = await supabase.auth.signInWithPassword({
      email:userEmail,
      password:userPass,
    });

    if (loginResult.error) {
      alert(loginResult.error.message);
    } else {
   
      nav('/meetingpage');
    }

    sIsLoading(false); 
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-black text-white overflow-hidden">
      <div className="p-8 bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">Login</h1>

        <form onSubmit={loginHandler} className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="text-blue-500" />
            <input
              type="email"
              placeholder="Enter your email"
              className="p-3 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              value={userEmail}
              onChange={(e) => sUserEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <Lock className="text-blue-500" />
            <input
              type="password"
              placeholder="Enter your password"
              className="p-3 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              value={userPass}
              onChange={(e) => sUserPass(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={`px-4 py-2 rounded w-full font-semibold transition ${
              isLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isLoading}
          >
            {isLoading ?'Logging in...' :'Login'}
          </button>
        </form>

        <div className="flex justify-between items-center mt-6 text-sm text-blue-600 font-medium">
          <Link to="/registerpage" className="hover:underline">Register</Link>
          <Link to="/meetingpage" className="hover:underline">Go to the meeting room</Link>
        </div>
      </div>
    </div>
  );
}
