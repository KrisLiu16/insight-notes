import React, { useEffect, useRef, useState } from 'react';
import { Plus, Tag, X } from 'lucide-react';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ tags, onChange }) => {
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  const handleInputConfirm = () => {
    if (inputValue && !tags.includes(inputValue)) {
      onChange([...tags, inputValue]);
    }
    setInputValue('');
    setInputVisible(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tag size={14} className="text-slate-400 shrink-0" />
      {tags.map(tag => (
        <span
          key={tag}
          className="group flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs hover:bg-slate-200 transition-colors cursor-default border border-slate-200"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="text-slate-400 hover:text-red-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} strokeWidth={3} />
          </button>
        </span>
      ))}

      {inputVisible ? (
        <input
          ref={inputRef}
          type="text"
          className="w-20 text-xs px-2 py-0.5 border border-blue-300 rounded-full outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onBlur={handleInputConfirm}
          onKeyDown={e => {
            if (e.key === 'Enter') handleInputConfirm();
            if (e.key === 'Escape') setInputVisible(false);
          }}
        />
      ) : (
        <button
          onClick={() => setInputVisible(true)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded-full transition-colors border border-dashed border-slate-300 hover:border-blue-200"
        >
          <Plus size={10} strokeWidth={3} /> 添加标签
        </button>
      )}
    </div>
  );
};

export default TagEditor;
