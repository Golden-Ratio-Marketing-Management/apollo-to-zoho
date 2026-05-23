export interface ZohoItem {
  First_Name: string
  Last_Name: string
  Lead_Source: "Apollo.io"
  Lead_Status: "Not Contacted"
  Client_Campaign: string
  Email: string
  Personal_Email?: string
  Designation?: string
  Mobile?: string
  Alternate_Number?: string
  LinkedIn_Profile?: string
  Company?: string
  Website?: string
  Company_LinkedIn_Profile?: string
}

export interface ZohoTokenResponse {
  access_token: string
  scope: string
  api_domain: string
  token_type: string
  expires_in: number
}

export interface ZohoCampaignPicklistResponse {
  global_picklists: {
    created_time: string;
    customizable: boolean;
    description: string | null;
    pick_list_values_sorted_lexically: boolean;
    source: string;
    created_by: {
      name: string;
      id: string;
    };
    display_label: string;
    modified_time: string;
    api_name: string;
    modified_by: {
      name: string;
      id: string;
    };
    id: string;
    presence: boolean;
    actual_label: string;
    pick_list_values: {
      display_value: string;
      sequence_number: number;
      reference_value: string;
      actual_value: string;
      id: string;
      type: "used" | "unused";
    }[];
  }[];
}

export interface SelectOption {
  id: string
  label: string
}