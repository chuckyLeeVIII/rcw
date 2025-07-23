import React, { useState } from 'react';
import { CopyIcon } from './CopyIcon';

interface BlockchainIdProps {
  id: string;
  linkUrl?: string;
  showCopy?: boolean;
}

export function BlockchainId({ id, linkUrl, showCopy = true }: BlockchainIdProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="relative flex items-center gap-1 px-2 py-1.5 rounded bg-gray-800 font-mono text-sm max-w-full m-0">
      {linkUrl ? (
        <a 
          href={linkUrl}
          className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-blue-400 hover:text-blue-300 transition-colors"
        >
          {id}
        </a>
      ) : (
        <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-gray-300">
          {id}
        </span>
      )}
      {showCopy && (
        <>
          <button
            onClick={handleCopyClick}
            className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
            title="Copy to clipboard"
          >
            <CopyIcon />
          </button>
          {showTooltip && (
            <div className="absolute -top-8 right-0 bg-green-600 text-white px-2 py-1 rounded text-xs animate-fade-out">
              Copied!
            </div>
          )}
        </>
      )}
    </div>
  );
}