
# Implementation Plan for Database and CMS Changes

## 1. Opening Hours Implementation

### Database Changes
- Change `opening_hours` field in `listing_translations` table from `text` to `jsonb`
- Keep the field nullable to support cases where hours are unknown

### CMS Implementation
- Create a new component `OpeningHoursInput` with:
  - 7 rows (one for each day)
  - Each row contains:
    - Day name (read-only)
    - "Closed" checkbox/toggle
    - Time inputs for open/close (disabled when closed)
    - Notes field
  - Default state: all days marked as closed
  - Validation: none required (field is nullable)

### Frontend Display
- Create a component to parse and display the JSON data
- Handle special cases:
  - All days closed → Display "Permanently Closed"
  - Partial data → Display available hours
  - Null value → Display nothing or "Hours not available"

## 2. Tag/Keyword Fields Implementation

### Affected Fields
- `popular_stores`
- `entertainment`
- `dining_options`
- `special_services`
- `cuisine_type`
- `best_time_to_visit`

### Database Changes
- No changes needed (already using `text[]`)

### CMS Implementation
- Replace current comma-separated text inputs with a TagInput component
- Features:
  - Type and press comma/Enter to create tag
  - Visual tag display with remove button
  - Auto-complete suggestions (optional)
  - Clear all button

### Frontend Display
- Display tags as badges/chips
- Consistent styling across all tag fields

## 3. Parking Info Implementation

### Database Changes
- Change `parking_info` from `text` to `text[]`

### CMS Implementation
- Create a CheckboxGroup component with predefined options:
  - Street Parking
  - Paid Parking Lot
  - Free Parking Lot
  - Valet Parking
  - Garage Parking
  - No Parking Available
- Allow multiple selections

### Frontend Display
- Display selected options as badges/chips
- Consistent styling with other tag displays

## 4. Price Range Implementation

### Database Changes
- Change `price_range` from `text` to `integer`
- Store values 1-5 (representing $ to $$$$$)

### CMS Implementation
- Create a custom `PriceRangeInput` component:
  - Display 5 clickable dollar signs
  - Visual feedback on hover and selection
  - Store selected number (1-5)

### Frontend Display
- Display 5 dollar signs with selected number highlighted
- Example: If value is 3, display "$$$" with first three highlighted

## 5. Dietary Options Implementation

### Database Changes
- No changes needed (already using `text[]`)

### CMS Implementation
- Create a CheckboxGroup component with predefined options:
  - Vegetarian
  - Vegan
  - Gluten-Free
  - Halal
  - Kosher
  - (Add other options as needed)
- Allow multiple selections

### Frontend Display
- Display selected options as badges/chips
- Consistent styling with other tag displays

## 6. Entry Fee Implementation

### Database Changes
- Change `entry_fee` from `text` to `jsonb`

### CMS Implementation
- Create a component with three separate text inputs:
  - Entry Fee (Locals)
  - Entry Fee (Tourists)
  - Entry Fee (Children)
- Store as JSON object:
  ```json
  {
    "locals": "10 IQD",
    "tourists": "20 USD",
    "children": "Free"
  }
  ```

### Frontend Display
- Create a component to parse and display the JSON data
- Format each fee type clearly
- Handle null/empty values gracefully

## 7. Fields to Remove

### Database Changes
Remove these fields from `listing_translations` table:
- `nearby_attractions`
- `reservation_info`
- `seating_options`
- `special_features`

### Implementation Steps
1. Create database migration to remove fields
2. Update CMS forms to remove corresponding inputs
3. Update any frontend components that might reference these fields
4. Update any API endpoints that might use these fields

## Implementation Order

1. First Phase:
   - Remove fields marked for deletion
   - Implement Opening Hours changes
   - Implement Price Range changes

2. Second Phase:
   - Implement Tag/Keyword fields
   - Implement Parking Info
   - Implement Dietary Options

3. Third Phase:
   - Implement Entry Fee changes
   - Update frontend display components
   - Add any necessary translations

## Testing Plan

1. Database Changes:
   - Test migrations on development database
   - Verify data integrity after changes
   - Test rollback procedures

2. CMS Changes:
   - Test all new input components
   - Verify data saving and loading
   - Test edge cases (null values, etc.)

3. Frontend Changes:
   - Test display components
   - Verify responsive design
   - Test with various data scenarios

## Rollback Plan

1. Database:
   - Keep backup of current schema
   - Document all changes
   - Create rollback migrations

2. Code:
   - Use feature flags for new components
   - Keep old components available
   - Document rollback procedures 