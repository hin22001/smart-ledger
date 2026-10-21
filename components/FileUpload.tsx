import React, { useCallback, useState, useEffect } from 'react';
import { Upload, HardDrive } from 'lucide-react';
import { hasStorageData } from '../services/storageService';

interface FileUploadProps {
  onDataLoaded: (csvContents: string[]) => void;
  onLoadFromStorage: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, onLoadFromStorage }) => {
  const [hasSavedData, setHasSavedData] = useState(false);

  useEffect(() => {
    setHasSavedData(hasStorageData());
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const filePromises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(file);
        });
      });

      const contents = await Promise.all(filePromises);
      onDataLoaded(contents);
    }
  }, [onDataLoaded]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer relative group shadow-sm">
        <input 
            type="file" 
            accept=".csv"
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="bg-indigo-100 p-4 rounded-full mb-4 group-hover:bg-indigo-200 transition-colors">
            <Upload className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700">Upload your Statement(s)</h3>
        <p className="text-slate-500 text-sm mt-2 text-center max-w-xs">
            Select one or multiple CSV files formatted with standard banking columns.
        </p>
        </div>

        {hasSavedData && (
            <div className="flex items-center justify-center">
                <button 
                    onClick={onLoadFromStorage}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors px-4 py-2 rounded-lg hover:bg-slate-100"
                >
                    <HardDrive className="w-4 h-4" />
                    Load previous session from storage
                </button>
            </div>
        )}
    </div>
  );
};