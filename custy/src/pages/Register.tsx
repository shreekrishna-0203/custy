import { useState} from 'react';
import { supabase} from '../lib/supabaseClient';
import { useNavigate} from 'react-router-dom';
import { Mail, Lock} from 'lucide-react';

export default function Register() {
  const [email, sEmail] = useState('');
  const [password, sPassword] = useState('');
  const [confirmPassword, sConfirmPassword] = useState('');
  const [loading, sLoading] = useState(false);
  const navigate = useNavigate();

  const hRegister = async(e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    sLoading(true);
    
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin + '/loginpage'
      }
    });
    
    if (error) {
      alert(error.message);
    } else {
      alert('Registration successful! Please check your email to verify your account.');
      navigate('/loginpage');
    }
    
    sLoading(false);
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-black text-white overflow-hidden">
      <div className="p-8 bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">Register</h1>
        <form onSubmit={hRegister} className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="text-blue-500" />
            <input
              type="email"
              placeholder="Email"
              className="p-3 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              value={email}
              onChange={e => sEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <Lock className="text-blue-500" />
            <input
              type="password"
              placeholder="Password"
              className="p-3 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              value={password}
              onChange={e => sPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <Lock className="text-blue-500" />
            <input
              type="password"
              placeholder="Confirm your password"
              className="p-3 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              value={confirmPassword}
              onChange={e => sConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className={`px-4 py-2 rounded w-full font-semibold transition ${
              loading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}