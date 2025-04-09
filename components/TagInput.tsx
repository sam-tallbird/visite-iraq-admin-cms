'use client';

import React, { useState, KeyboardEvent, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ 
  value = [], 
  onChange, 
  placeholder = "Add tags...",
  className
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const addTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag]);
    }
    setInputValue(''); // Clear input after adding
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Add tag on Enter or Comma press
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); // Prevent form submission on Enter or typing comma
      addTag(inputValue);
    }
    // Remove last tag on Backspace if input is empty
    if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    // Split pasted data by common delimiters (comma, semicolon, newline) and add tags
    const pastedTags = pasteData.split(/[\n,;]+/).map(tag => tag.trim()).filter(tag => tag);
    const newTags = Array.from(new Set([...value, ...pastedTags])) // Add unique tags
                      .filter(tag => tag); // Ensure no empty tags remain
    onChange(newTags);
    setInputValue(''); // Clear input after paste
  };

  return (
    <div className={`border rounded-md p-2 flex flex-wrap items-center gap-2 ${className}`}>
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
          {tag}
          <button 
            type="button" 
            onClick={() => removeTag(tag)} 
            className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label={`Remove ${tag}`}
          >
             <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </Badge>
      ))}
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste} // Handle pasting tags
        placeholder={placeholder}
        className="flex-1 border-none shadow-none focus-visible:ring-0 h-auto py-1 px-1 min-w-[80px]"
      />
    </div>
  );
} 