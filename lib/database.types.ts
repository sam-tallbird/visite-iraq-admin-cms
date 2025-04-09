export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      category_translations: {
        Row: {
          category_id: string
          description: string | null
          icon_url: string | null
          id: string
          language_code: string
          name: string
          slug: string | null
        }
        Insert: {
          category_id: string
          description?: string | null
          icon_url?: string | null
          id?: string
          language_code: string
          name: string
          slug?: string | null
        }
        Update: {
          category_id?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          language_code?: string
          name?: string
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_collection_items: {
        Row: {
          collection_id: string
          created_at: string | null
          feature_on_home: boolean
          id: string
          listing_id: string
          updated_at: string | null
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          feature_on_home?: boolean
          id?: string
          listing_id: string
          updated_at?: string | null
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          feature_on_home?: boolean
          id?: string
          listing_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curated_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "curated_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_collection_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_collection_translations: {
        Row: {
          collection_id: string
          created_at: string | null
          id: string
          language_code: string
          name: string
          updated_at: string | null
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          id?: string
          language_code: string
          name: string
          updated_at?: string | null
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          id?: string
          language_code?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curated_collection_translations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "curated_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_collections: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          listing_id: string
          saved_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          saved_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          saved_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banner_translations: {
        Row: {
          banner_id: string
          created_at: string
          id: string
          language_code: string
          text: string | null
          updated_at: string
        }
        Insert: {
          banner_id: string
          created_at?: string
          id?: string
          language_code: string
          text?: string | null
          updated_at?: string
        }
        Update: {
          banner_id?: string
          created_at?: string
          id?: string
          language_code?: string
          text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_banner_translations_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "hero_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banners: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_path: string
          is_active: boolean
          link_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_path: string
          is_active?: boolean
          link_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string
          is_active?: boolean
          link_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      listing_categories: {
        Row: {
          category_id: string
          listing_id: string
        }
        Insert: {
          category_id: string
          listing_id: string
        }
        Update: {
          category_id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_categories_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_tags: {
        Row: {
          listing_id: string
          tag_id: string
        }
        Insert: {
          listing_id: string
          tag_id: string
        }
        Update: {
          listing_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_tags_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_translations: {
        Row: {
          activities: string[] | null
          best_time_to_visit: string | null
          cuisine_type: string | null
          description: string | null
          dietary_options: string[] | null
          dining_options: string[] | null
          duration: string | null
          entertainment: string[] | null
          entry_fee: string | null
          entry_rules: string | null
          facilities: string[] | null
          highlights: string[] | null
          historical_significance: string | null
          id: string
          language_code: string
          listing_id: string
          menu_highlights: string[] | null
          name: string
          nearby_attractions: string[] | null
          opening_hours: string | null
          parking_info: string | null
          popular_stores: string[] | null
          price_range: string | null
          religious_significance: string | null
          reservation_info: string | null
          safety_tips: string | null
          seating_options: string[] | null
          slug: string | null
          special_features: string[] | null
          special_services: string[] | null
          story_behind: string | null
          tips: string | null
          tour_guide_availability: string | null
        }
        Insert: {
          activities?: string[] | null
          best_time_to_visit?: string | null
          cuisine_type?: string | null
          description?: string | null
          dietary_options?: string[] | null
          dining_options?: string[] | null
          duration?: string | null
          entertainment?: string[] | null
          entry_fee?: string | null
          entry_rules?: string | null
          facilities?: string[] | null
          highlights?: string[] | null
          historical_significance?: string | null
          id?: string
          language_code: string
          listing_id: string
          menu_highlights?: string[] | null
          name: string
          nearby_attractions?: string[] | null
          opening_hours?: string | null
          parking_info?: string | null
          popular_stores?: string[] | null
          price_range?: string | null
          religious_significance?: string | null
          reservation_info?: string | null
          safety_tips?: string | null
          seating_options?: string[] | null
          slug?: string | null
          special_features?: string[] | null
          special_services?: string[] | null
          story_behind?: string | null
          tips?: string | null
          tour_guide_availability?: string | null
        }
        Update: {
          activities?: string[] | null
          best_time_to_visit?: string | null
          cuisine_type?: string | null
          description?: string | null
          dietary_options?: string[] | null
          dining_options?: string[] | null
          duration?: string | null
          entertainment?: string[] | null
          entry_fee?: string | null
          entry_rules?: string | null
          facilities?: string[] | null
          highlights?: string[] | null
          historical_significance?: string | null
          id?: string
          language_code?: string
          listing_id?: string
          menu_highlights?: string[] | null
          name?: string
          nearby_attractions?: string[] | null
          opening_hours?: string | null
          parking_info?: string | null
          popular_stores?: string[] | null
          price_range?: string | null
          religious_significance?: string | null
          reservation_info?: string | null
          safety_tips?: string | null
          seating_options?: string[] | null
          slug?: string | null
          special_features?: string[] | null
          special_services?: string[] | null
          story_behind?: string | null
          tips?: string | null
          tour_guide_availability?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_translations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string | null
          google_maps_link: string | null
          id: string
          latitude: number | null
          listing_type: string
          location: string
          location_id: string | null
          longitude: number | null
          photos_videos: string[] | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          google_maps_link?: string | null
          id?: string
          latitude?: number | null
          listing_type?: string
          location: string
          location_id?: string | null
          longitude?: number | null
          photos_videos?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          google_maps_link?: string | null
          id?: string
          latitude?: number | null
          listing_type?: string
          location?: string
          location_id?: string | null
          longitude?: number | null
          photos_videos?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_translations: {
        Row: {
          address: string | null
          city: string // Manually Added
          description: string | null
          id: string
          language_code: string
          location_id: string
          name: string
        }
        Insert: {
          address?: string | null
          city: string // Manually Added
          description?: string | null
          id?: string
          language_code: string
          location_id: string
          name: string
        }
        Update: {
          address?: string | null
          city?: string // Manually Added (Optional on update)
          description?: string | null
          id?: string
          language_code?: string
          location_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_translations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string | null
          google_maps_link: string | null
          google_place_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          google_maps_link?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          google_maps_link?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string | null
          description: string | null
          file_path: string | null
          id: string
          is_primary: boolean | null
          listing_id: string
          media_type: string
          order_index: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          is_primary?: boolean | null
          listing_id: string
          media_type: string
          order_index?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          is_primary?: boolean | null
          listing_id?: string
          media_type?: string
          order_index?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string | null
          profile_picture: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string | null
          profile_picture?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string | null
          profile_picture?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tag_translations: {
        Row: {
          id: string
          language_code: string
          name: string
          tag_id: string
        }
        Insert: {
          id?: string
          language_code: string
          name: string
          tag_id: string
        }
        Update: {
          id?: string
          language_code?: string
          name?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_translations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          preferred_language: string | null
          preferred_theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferred_language?: string | null
          preferred_theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferred_language?: string | null
          preferred_theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_home_page_sections:
        | {
            Args: {
              p_language_code: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_language_code: string
              p_item_limit: number
            }
            Returns: Json
          }
      get_listings_for_collection: {
        Args: {
          p_collection_slug: string
          p_language_code: string
        }
        Returns: Json
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export {}; // Ensure file is treated as a module
