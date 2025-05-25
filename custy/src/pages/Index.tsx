import { Link} from "react-router-dom";
import { Video, Play,ArrowRight} from "lucide-react";

const Index = () => {
  return (
    <div className="w-screen h-screen bg-gradient-to-br
     from-slate-50 via-blue-50 to-indigo-100">
      <nav className="backdrop-blur-xl bg-white/80 border-b
       border-blue-200/50 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Video className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              custy
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/loginpage"
              className="px-6 py-2 text-gray-700 hover:text-blue-600 font-medium">
              Sign In
            </Link>
            <Link
              to="/registerpage"
              className="px-6 py-2 bg-gradient-to-r from-blue-600
               to-purple-600 text-white rounded-xl hover:from-blue-700
                hover:to-purple-700 font-medium shadow-lg">
              Register
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6">
        <div className="text-center py-24">
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-gray-900 via-blue-900
             to-purple-900 bg-clip-text text-transparent">
              The Future of
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 
            bg-clip-text text-transparent">
              Video Meetings
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Connect instantly with high-quality video calls and smart
            collaboration tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/meetingpage"
              className="group inline-flex items-center px-8
               py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white 
               text-lg rounded-2xl hover:from-blue-700 hover:to-purple-700 shadow-xl">
              <Play className="h-5 w-5 mr-2" />
              Start Meeting
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1
               transition-transform" />
            </Link>
            <Link
              to="/loginpage"
              className="inline-flex items-center px-8 py-4
               bg-white text-gray-700 text-lg rounded-2xl border
                border-gray-200 hover:border-blue-300 hover:text-blue-600 shadow">
              Join Meeting
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
