import React from 'react';
import { HelpCircle, BookOpen, MessageSquare, ExternalLink } from 'lucide-react';

export function HelpPage() {
  return (
    <div className="space-y-6">
      <div className="card-glass rounded-xl p-6 neon-border">
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-cyan-400" />
          Support & Documentation
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-glass rounded-xl p-6 border border-gray-700/30">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" /> Knowledge Base
          </h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li className="flex items-center gap-2 hover:text-white cursor-pointer"><ExternalLink className="w-4 h-4" /> How to recover a .dat wallet</li>
            <li className="flex items-center gap-2 hover:text-white cursor-pointer"><ExternalLink className="w-4 h-4" /> Understanding derivation paths</li>
            <li className="flex items-center gap-2 hover:text-white cursor-pointer"><ExternalLink className="w-4 h-4" /> Safety precautions during recovery</li>
          </ul>
        </div>

        <div className="card-glass rounded-xl p-6 border border-gray-700/30">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" /> Community Support
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Join our Discord for real-time help from the community and developers.
          </p>
          <button className="btn-neon text-sm py-2 px-4">Join Discord</button>
        </div>
      </div>
    </div>
  );
}
