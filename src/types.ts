export interface Venue {
  id: string;
  name: string;
  description: string;
  foodCategory: string;
  targetDistrict: string;
  imageUrl: string;
  rating: number;
  ratingCount: number;
  mapsUrl: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  targetDistrict: string;
  foodCategory: string;
  createdBy: string;
  createdByName: string;
  members: string[];
  createdAt: any;
  meetingDate?: string;
  meetingTime?: string;
}

export type Screen = 'LOGIN' | 'SIGNUP' | 'DASHBOARD' | 'CREATE_GROUP' | 'GROUPS_LIST' | 'GROUP_DETAIL' | 'PROFILE' | 'MAP';
