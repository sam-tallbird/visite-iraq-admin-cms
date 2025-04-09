import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string; // Comma-separated string
  onTagsChange: (value: string) => void; // Renamed prop
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      value = "",
      onTagsChange,
      placeholder,
      maxTags,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null); // Use this ref for the actual input element

    // Effect to parse the comma-separated string prop into tags array
    useEffect(() => {
      if (value !== tags.join(",")) {
        const initialTags = value
          ? value.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [];
        setTags(initialTags);
      }
      // Intentionally disable exhaustive-deps, we only want this to run when `value` prop changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const addTag = useCallback((tagValue: string) => {
        const newTag = tagValue.trim();
        if (!newTag) return; // Don't add empty tags
        if (tags.includes(newTag)) return; // Don't add duplicate tags
        if (maxTags && tags.length >= maxTags) return; // Respect maxTags limit

        // Update internal state first
        const updatedTags = [...tags, newTag];
        setTags(updatedTags);
        setInputValue(""); // Clear input after adding

        // Notify parent with the new comma-separated string
        onTagsChange(updatedTags.join(","));

      }, [tags, maxTags, onTagsChange]); // Added onTagsChange dependency


    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault(); // Prevent form submission on Enter or adding comma to input
            addTag(inputValue);
        } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
            // Remove last tag on backspace if input is empty
            const updatedTags = tags.slice(0, -1);
            setTags(updatedTags);
            // Notify parent after removing tag with backspace
            onTagsChange(updatedTags.join(",")); 
        }
    };

    const removeTag = (tagToRemove: string) => {
      const updatedTags = tags.filter((tag) => tag !== tagToRemove);
      setTags(updatedTags);
      // Notify parent with the new comma-separated string
      onTagsChange(updatedTags.join(","));
    };

    // Combine the forwarded ref and the internal ref if necessary
    // This basic implementation uses the internal ref primarily.
    // A more complex implementation might merge refs if the parent needs direct access.

    return (
      <div className={cn("border rounded-md p-2 flex flex-wrap gap-2 items-center", className)}>
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {tag}
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full ml-1 p-0"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
        <Input
          ref={inputRef} // Use the internal ref here
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          disabled={disabled || (maxTags ? tags.length >= maxTags : false)}
          className="flex-grow border-none focus:ring-0 focus:outline-none shadow-none p-0 h-auto min-w-[80px]" // Basic styling to make it fit in
          {...props} // Spread remaining props
        />
      </div>
    );
  }
);

TagInput.displayName = "TagInput";

export { TagInput }; 