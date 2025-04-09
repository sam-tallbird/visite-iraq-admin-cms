import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

interface PriceRangeSelectorProps {
  value: number | null;
  onChange: (newValue: number | null) => void;
  maxLevel?: number;
}

export const PriceRangeSelector = ({ 
  value,
  onChange,
  maxLevel = 5 
}: PriceRangeSelectorProps) => {
  const [hoverLevel, setHoverLevel] = useState<number | null>(null);

  const handleMouseLeave = () => {
    setHoverLevel(null);
  };

  const handleMouseEnter = (level: number) => {
    setHoverLevel(level);
  };

  const handleClick = (level: number) => {
    // Allow toggling off if clicking the current value
    onChange(value === level ? null : level);
    setHoverLevel(null); // Reset hover after click
  };

  return (
    <div className="flex items-center space-x-1" onMouseLeave={handleMouseLeave}>
      {[...Array(maxLevel)].map((_, index) => {
        const level = index + 1;
        const isActive = value !== null && level <= value;
        const isHovering = hoverLevel !== null && level <= hoverLevel;
        
        return (
          <DollarSign
            key={level}
            className={cn(
              'h-5 w-5 cursor-pointer transition-colors',
              (isHovering || isActive) 
                ? 'text-yellow-500 fill-yellow-400/50' // Highlight color for active/hovered
                : 'text-muted-foreground/50 hover:text-yellow-400/80' // Default/inactive color
            )}
            onMouseEnter={() => handleMouseEnter(level)}
            onClick={() => handleClick(level)}
            aria-label={`Set price range to ${level}`}
          />
        );
      })}
    </div>
  );
}; 