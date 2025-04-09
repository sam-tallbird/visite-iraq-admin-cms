import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

// Updated DaySchedule interface for multilingual notes
interface DaySchedule {
  isOpen: boolean;    // Changed from isClosed
  is24Hours: boolean; // Added
  open: string;       // Renamed from openTime
  close: string;      // Renamed from closeTime
  notes_en: string;   // Changed from notes
  notes_ar: string;   // Added for Arabic
}

interface OpeningHoursInputProps {
  value: Record<string, DaySchedule> | null;
  onChange: (value: Record<string, DaySchedule>) => void;
}

const DAYS = [
  { id: 'Monday', label: 'Monday' },      // Use capitalized IDs consistent with previous JSON structure
  { id: 'Tuesday', label: 'Tuesday' },
  { id: 'Wednesday', label: 'Wednesday' },
  { id: 'Thursday', label: 'Thursday' },
  { id: 'Friday', label: 'Friday' },
  { id: 'Saturday', label: 'Saturday' },
  { id: 'Sunday', label: 'Sunday' },
] as const;

type DayId = typeof DAYS[number]['id'];

// Export the type with updated DaySchedule
export type OpeningHoursData = {
  [key: string]: DaySchedule;
};

export function OpeningHoursInput({ value, onChange }: OpeningHoursInputProps) {
  // Initialize with updated default values for multilingual notes
  const schedule: Record<DayId, DaySchedule> = value || DAYS.reduce((acc, day) => ({
    ...acc,
    [day.id]: {
      isOpen: false,      // Default to closed
      is24Hours: false,
      open: '09:00',
      close: '17:00',
      notes_en: '',       // Changed from notes
      notes_ar: '',       // Added
    }
  }), {} as Record<DayId, DaySchedule>);

  const handleDayChange = (dayId: DayId, field: keyof DaySchedule, newValue: any) => {
    const updatedSchedule = {
      ...schedule,
      [dayId]: {
        ...schedule[dayId],
        [field]: newValue,
      }
    };
    // If turning off isOpen, also turn off is24Hours
    if (field === 'isOpen' && !newValue) {
        updatedSchedule[dayId].is24Hours = false;
    }
    // If turning on is24Hours, ensure isOpen is true
    if (field === 'is24Hours' && newValue) {
        updatedSchedule[dayId].isOpen = true;
    }
    onChange(updatedSchedule);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {DAYS.map((day) => (
            <div key={day.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start border-b pb-4 last:border-b-0">
              {/* Day Label */}
              <Label className="md:col-span-1 font-medium pt-2">{day.label}</Label>

              {/* Controls Column */}
              <div className="md:col-span-5 space-y-3">
                {/* Is Open Switch */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${day.id}-open`}
                    // Use isOpen, with optional chaining and default
                    checked={schedule[day.id]?.isOpen ?? false} 
                    onCheckedChange={(checked) => handleDayChange(day.id, 'isOpen', checked)}
                  />
                  {/* Label changes based on state */}
                  <Label htmlFor={`${day.id}-open`}>{schedule[day.id]?.isOpen ? 'Open' : 'Closed'}</Label> 
                </div>

                {/* Conditional Controls: Only show if 'isOpen' is true */}
                {schedule[day.id]?.isOpen && ( // Check isOpen
                  <>
                    {/* Is 24 Hours Switch */}
                    <div className="flex items-center space-x-2 pl-4">
                      <Switch
                        id={`${day.id}-24hours`}
                        // Use is24Hours, with optional chaining and default
                        checked={schedule[day.id]?.is24Hours ?? false} 
                        onCheckedChange={(checked) => handleDayChange(day.id, 'is24Hours', checked)}
                      />
                      <Label htmlFor={`${day.id}-24hours`}>Open 24 Hours</Label>
                    </div>

                    {/* Time Inputs: Only show if isOpen and not 24 hours */}
                    {!(schedule[day.id]?.is24Hours) && ( // Check is24Hours
                      <div className="grid grid-cols-2 gap-4 pl-4">
                        <div className="space-y-1">
                          <Label htmlFor={`${day.id}-open-time`} className="text-sm">Open Time</Label>
                          <Input
                            id={`${day.id}-open-time`}
                            type="time"
                            // Use open field, with optional chaining and default
                            value={schedule[day.id]?.open ?? ''} 
                            onChange={(e) => handleDayChange(day.id, 'open', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`${day.id}-close-time`} className="text-sm">Close Time</Label>
                          <Input
                            id={`${day.id}-close-time`}
                            type="time"
                            // Use close field, with optional chaining and default
                            value={schedule[day.id]?.close ?? ''} 
                            onChange={(e) => handleDayChange(day.id, 'close', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Multilingual Notes Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* English Notes */}
                  <div className="space-y-1">
                    <Label htmlFor={`${day.id}-notes-en`} className="text-sm">Notes (English - Optional)</Label>
                    <Input
                      id={`${day.id}-notes-en`}
                      value={schedule[day.id]?.notes_en ?? ''} 
                      onChange={(e) => handleDayChange(day.id, 'notes_en', e.target.value)}
                      placeholder="e.g., Closed for lunch 1-2 PM"
                    />
                  </div>
                  {/* Arabic Notes */}
                  <div className="space-y-1">
                    <Label htmlFor={`${day.id}-notes-ar`} className="text-sm">Notes (Arabic - Optional)</Label>
                    <Input
                      id={`${day.id}-notes-ar`}
                      value={schedule[day.id]?.notes_ar ?? ''} 
                      onChange={(e) => handleDayChange(day.id, 'notes_ar', e.target.value)}
                      placeholder="مثال: مغلق للغداء 1-2 مساءً"
                      dir="rtl"
                    />
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 