import React, { useState } from 'react';

const Summarize: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY || 'YOUR_HUGGINGFACE_API_KEY';

  const handleSummarize = async () => {
    if (!apiKey) {
      setSummary('Please enter your API key first.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ inputs: inputText }),
        }
      );
      const result = await response.json();
      if (Array.isArray(result) && result.length > 0) {
        setSummary(result[0].summary_text || '');
      } else {
        setSummary('No summary generated. Please try again.');
      }
    } catch (error) {
      console.error('Error summarizing text:', error);
      if (error instanceof Error) {
        setSummary(`Error summarizing text: ${error.message}. Please check your API key and try again.`);
      } else {
        setSummary('Error summarizing text. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50
     via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl 
        shadow-xl border border-white/50 p-8">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r
           from-blue-600 to-purple-600 bg-clip-text 
           text-transparent text-center">
            Text Summarizer
          </h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text to Summarize
              </label>
              <textarea
                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all resize-none"
                rows={8}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to summarize..."
              />
            </div>

            <button
              onClick={handleSummarize}
              disabled={loading || !inputText}
              className={`w-full py-4 px-6 rounded-xl text-white 
                font-medium transition-all ${
                loading || !inputText
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              {loading ? 'Summarizing...' : 'Summarize Text'}
            </button>

            {summary && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Summary</h2>
                <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summarize;