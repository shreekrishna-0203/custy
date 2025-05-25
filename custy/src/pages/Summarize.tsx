import React, { useState } from 'react';
import { CohereClient } from 'cohere-ai';

const Summarize: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const handleSummarize = async () => {
    if (!apiKey) {
      setSummary('Please enter your API key first.');
      return;
    }

    setLoading(true);
    try {
      const cohere = new CohereClient({
        token: apiKey,
      });

      const response = await cohere.summarize({
        text: inputText,
        length: 'medium',
        format: 'paragraph',
        model: 'summarize-xlarge',
        additionalCommand: 'Create a clear and concise summary that captures the main points and key insights. Focus on the most important information while maintaining readability. Use active voice and present tense.',
        temperature: 0.2
      });
      
      setSummary(response.summary || '');
    } catch (error) {
      console.error('Error summarizing text:', error);
      // Check for specific error messages from Cohere API
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
            Text Summarizer
          </h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key (Store securely in production)
              </label>
              <input
                type="password"
                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Cohere API key..."
              />
            </div>

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
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSummarize}
              disabled={loading || !inputText.trim()}
            >
              {loading ? 'Summarizing...' : 'Summarize Text'}
            </button>

            {summary && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Summary:</h2>
                <p className="text-gray-700 leading-relaxed">{summary}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summarize;