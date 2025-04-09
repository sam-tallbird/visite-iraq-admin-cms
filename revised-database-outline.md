# Listing-Related Database Field Outline

**Table: `listings`**

*   **Field:** `location`
*   **Data Type:** `text`
*   **Comment:** Free text input, typically used for the primary address or location name (like in English).
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `google_maps_link`
*   **Data Type:** `text`
*   **Comment:** Link/URL input for a Google Maps location.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `tags`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `photos_videos`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Stores an array of paths/URLs to uploaded images/videos. Input is handled via file upload in the CMS.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `latitude`
*   **Data Type:** `double precision`
*   **Comment:** Number input, allows decimals (for geographic coordinate).
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `longitude`
*   **Data Type:** `double precision`
*   **Comment:** Number input, allows decimals (for geographic coordinate).
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `listing_type`
*   **Data Type:** `text`
*   **Comment:** Select from predefined options (e.g., 'Shop/Mall', 'Restaurant/Café', 'Other').
*   **My Feedback:**
*   **Improvement notes:**

**Table: `listing_translations`**

*   **Field:** `name`
*   **Data Type:** `text`
*   **Comment:** Free text input for the listing's name in a specific language (English/Arabic).
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `description`
*   **Data Type:** `text`
*   **Comment:** Free text input (longer form) for the listing's description in a specific language.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `opening_hours`
*   **Data Type:** `text`
*   **Comment:** Free text input for opening hours.
*   **My Feedback:**i want it to appear in the front end in this type of format 
Tuesday	9 AM–6 PM
Wednesday 9 AM–6 PM
Hours might differ
Thursday	9 AM–6 PM
Friday	Closed
Saturday	10 AM–5 PM
Sunday	9 AM–6 PM
Monday	9 AM–6 PM
*   **Improvement notes:**

*   **Field:** `popular_stores`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Shop/Mall specific).
*   **My Feedback:** i want it to appear simillar to key words or tags in the cms each","means the end f the word if you understand what i mean  and to appear in the front end as badges

*   **Improvement notes:**

*   **Field:** `entertainment`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Shop/Mall specific).
*   **My Feedback:**i want it to appear simillar to key words or tags in the cms each","means the end f the word if you understand what i mean  and to appear in the front end as badges
*   **Improvement notes:**

*   **Field:** `dining_options`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Shop/Mall specific).
*   **My Feedback:**i want it to appear simillar to key words or tags in the cms each","means the end f the word if you understand what i mean  and to appear in the front end as badges
*   **Improvement notes:**

*   **Field:** `special_services`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Shop/Mall specific).
*   **My Feedback:**i want it to appear simillar to key words or tags in the cms each","means the end f the word if you understand what i mean  and to appear in the front end as badges

*   **Improvement notes:**

*   **Field:** `nearby_attractions`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Used by multiple types).
*   **My Feedback:** i want to remove this from the database
*   **Improvement notes:**

*   **Field:** `parking_info`
*   **Data Type:** `text`
*   **Comment:** Free text input for parking details (Used by multiple types).
*   **My Feedback:**in the cms i want it te appear as mulity select and in the frontend its appears as badges 
Paid Parking
Valet Parking
Self Parking
VIP Parking
Street Parking
Garage Parking
*   **Improvement notes:**

*   **Field:** `cuisine_type`
*   **Data Type:** `text`
*   **Comment:** Free text input for type of cuisine (Restaurant/Café specific).
*   **My Feedback:**i want it to appear simillar to key words or tags in the cms each","means the end f the word if you understand what i mean  and to appear in the front end as badges
*   **Improvement notes:**

*   **Field:** `story_behind`
*   **Data Type:** `text`
*   **Comment:** Free text input (longer form) for the story behind the place (Restaurant/Café specific).
*   **My Feedback:** no feedback 
*   **Improvement notes:**

*   **Field:** `menu_highlights`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Restaurant/Café specific).
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `price_range`
*   **Data Type:** `text`
*   **Comment:** Free text input for price range (e.g., $, $$, $$$) (Restaurant/Café, Experience specific).
*   **My Feedback:** so i want it in the cms to be a range of  five us dollar sgins ($$$$$) and the dataintery person 
to be able to chose the range for example if he clicked the thrid on 3 $ will be highlighted and it will show in the fornt end the same 5 $ and 3 $ highlighted for our example
*   **Improvement notes:**

*   **Field:** `dietary_options`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Restaurant/Café specific).
*   **My Feedback:**multi selelect from a set types 
*   **Improvement notes:**

*   **Field:** `reservation_info`
*   **Data Type:** `text`
*   **Comment:** Free text input for reservation details (Restaurant/Café specific).
*   **My Feedback:** i want to remove this completley from the data base 
*   **Improvement notes:**

*   **Field:** `seating_options`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Restaurant/Café specific).
*   **My Feedback:** i want this to be completly removed from the database
*   **Improvement notes:**

*   **Field:** `special_features`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Restaurant/Café specific).
*   **My Feedback:** i want to completly remove this from the database
*   **Improvement notes:**

*   **Field:** `historical_significance`
*   **Data Type:** `text`
*   **Comment:** Free text input (longer form) for historical significance (Historical Site specific).
*   **My Feedback:**no feedback
*   **Improvement notes:**

*   **Field:** `entry_fee`
*   **Data Type:** `text`
*   **Comment:** Free text input for entry fee details (Historical Site, Park/Nature, Museum specific).
*   **My Feedback:** ok i want it to still be as text but i want 3 input fieds for this (locals , tourist and children )
*   **Improvement notes:**

*   **Field:** `best_time_to_visit`
*   **Data Type:** `text`
*   **Comment:** Free text input for best time to visit (Historical Site, Park/Nature, Museum, Religious Site specific).
*   **My Feedback:**i want it to appear simillar to key words or tags in the cms each","means the end f the word if you understand what i mean  and to appear in the front end as badges
*   **Improvement notes:**

*   **Field:** `tour_guide_availability`
*   **Data Type:** `text`
*   **Comment:** Free text input regarding tour guides (Historical Site, Museum specific).
*   **My Feedback:**i will explain this later 
*   **Improvement notes:**

*   **Field:** `tips`
*   **Data Type:** `text`
*   **Comment:** Free text input (longer form) for tips (Historical Site, Experience, Museum, Religious Site specific).
*   **My Feedback:**no feedback
*   **Improvement notes:**

*   **Field:** `activities`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Park/Nature specific).
*   **My Feedback:**ill explain this later
*   **Improvement notes:**

*   **Field:** `facilities`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Historical Site, Park/Nature, Museum, Religious Site specific).
*   **My Feedback:**i will explain this later
*   **Improvement notes:**

*   **Field:** `safety_tips`
*   **Data Type:** `text`
*   **Comment:** Free text input (longer form) for safety tips (Park/Nature, Experience specific).
*   **My Feedback:**no feedback 
*   **Improvement notes:**

*   **Field:** `duration`
*   **Data Type:** `text`
*   **Comment:** Free text input for expected duration (Experience specific).
*   **My Feedback:**no feedbacl
*   **Improvement notes:**

*   **Field:** `highlights`
*   **Data Type:** `ARRAY` (`text[]`)
*   **Comment:** Currently handled as a comma-separated text list in the CMS (Experience, Museum specific).
*   **My Feedback:**no feedback
*   **Improvement notes:**

*   **Field:** `religious_significance`
*   **Data Type:** `text`
*   **Comment:** Free text input (longer form) for religious significance (Religious Site specific).
*   **My Feedback:**no feedbacl
*   **Improvement notes:**

*   **Field:** `entry_rules`
*   **Data Type:** `text`
*   **Comment:** Free text input (longer form) for entry rules (Religious Site specific).
*   **My Feedback:** no feedback
*   **Improvement notes:**

*   **Field:** `slug`
*   **Data Type:** `text`
*   **Comment:** Text input, usually auto-generated but can be manually edited. Used in URLs.
*   **My Feedback:**
*   **Improvement notes:**

**Table: `locations`**

*   **Field:** `latitude`
*   **Data Type:** `double precision`
*   **Comment:** Number input, allows decimals (for geographic coordinate). Tied to the separate location entry.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `longitude`
*   **Data Type:** `double precision`
*   **Comment:** Number input, allows decimals (for geographic coordinate). Tied to the separate location entry.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `google_maps_link`
*   **Data Type:** `text`
*   **Comment:** Link/URL input for a Google Maps location. Tied to the separate location entry.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `google_place_id`
*   **Data Type:** `text`
*   **Comment:** Text identifier from Google Places API, usually fetched automatically. Tied to the separate location entry.
*   **My Feedback:**
*   **Improvement notes:**

**Table: `location_translations`**

*   **Field:** `name`
*   **Data Type:** `text`
*   **Comment:** Free text input for the location's name in a specific language (often same as address).
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `address`
*   **Data Type:** `text`
*   **Comment:** Free text input for the location's address in a specific language.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `description`
*   **Data Type:** `text`
*   **Comment:** Free text input (longer form) for the location's description in a specific language.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `city`
*   **Data Type:** `text`
*   **Comment:** Select from predefined province/city options (English/Arabic).
*   **My Feedback:**
*   **Improvement notes:**

**Table: `media`**

*   **Field:** `media_type`
*   **Data Type:** `text`
*   **Comment:** Text indicating the type (e.g., 'image', 'video'). Currently handled implicitly by image upload.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `url`
*   **Data Type:** `text`
*   **Comment:** Link/URL to the media file (usually in Supabase storage). Handled by file upload.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `description`
*   **Data Type:** `text`
*   **Comment:** Free text input for media description/alt text (Not currently implemented in CMS).
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `order_index`
*   **Data Type:** `integer`
*   **Comment:** Number input to control display order of media (Not currently implemented in CMS).
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `file_path`
*   **Data Type:** `text`
*   **Comment:** Path to the file within Supabase storage. Handled by file upload.
*   **My Feedback:**
*   **Improvement notes:**

*   **Field:** `is_primary`
*   **Data Type:** `boolean`
*   **Comment:** Checkbox/Switch to mark one image as the primary/thumbnail (Not currently implemented in CMS).
*   **My Feedback:**
*   **Improvement notes:**

**Table: `curated_collection_items`** (Junction table for Listings <-> Collections)

*   **Field:** `feature_on_home`
*   **Data Type:** `boolean`
*   **Comment:** Checkbox/Switch in CMS to indicate if this listing should be featured when shown as part of a collection on the homepage.
*   **My Feedback:**
*   **Improvement notes:** 