import { supabase } from './supabase';

export interface Hostel {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  country: string;
  price_per_night: number;
  room_type: 'dorm' | 'private' | 'mixed';
  beds_available: number;
  verified: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface HostelWithDetails extends Hostel {
  images: Array<{ id: string; image_url: string; display_order: number }>;
  amenities: Array<{ id: string; name: string; icon: string }>;
}

function validateString(value: any, fieldName: string, maxLength = 500): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  if (value.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength}`);
  }
  return value.trim();
}

function validateNumber(value: any, fieldName: string, min = 0, max = Infinity): number {
  const num = Number(value);
  if (isNaN(num) || num < min || num > max) {
    throw new Error(`${fieldName} must be a number between ${min} and ${max}`);
  }
  return num;
}

function validateRoomType(value: any): 'dorm' | 'private' | 'mixed' {
  if (!['dorm', 'private', 'mixed'].includes(value)) {
    throw new Error('Invalid room type. Must be dorm, private, or mixed');
  }
  return value;
}

export async function getHostels(filters?: {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  roomType?: string;
}) {
  let query = supabase
    .from('hostels')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.city) {
    const city = validateString(filters.city, 'City', 100);
    query = query.ilike('city', `%${city}%`);
  }

  if (filters?.minPrice !== undefined) {
    const minPrice = validateNumber(filters.minPrice, 'Minimum price', 0, 100000);
    query = query.gte('price_per_night', minPrice);
  }

  if (filters?.maxPrice !== undefined) {
    const maxPrice = validateNumber(filters.maxPrice, 'Maximum price', 0, 100000);
    query = query.lte('price_per_night', maxPrice);
  }

  if (filters?.roomType) {
    validateRoomType(filters.roomType);
    query = query.eq('room_type', filters.roomType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch hostels');
  }

  return data || [];
}

export async function getHostelById(id: string): Promise<HostelWithDetails | null> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid hostel ID');
  }

  const { data: hostel, error: hostelError } = await supabase
    .from('hostels')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (hostelError) {
    throw new Error('Failed to fetch hostel');
  }

  if (!hostel) {
    return null;
  }

  const { data: images, error: imageError } = await supabase
    .from('hostel_images')
    .select('*')
    .eq('hostel_id', id)
    .order('display_order', { ascending: true });

  if (imageError) {
    throw new Error('Failed to fetch hostel images');
  }

  const { data: hostelAmenities, error: amenityError } = await supabase
    .from('hostel_amenities')
    .select('amenity_id, amenities(id, name, icon)')
    .eq('hostel_id', id);

  if (amenityError) {
    throw new Error('Failed to fetch hostel amenities');
  }

  const amenities = hostelAmenities?.map((item: any) => item.amenities).filter(Boolean) || [];

  return {
    ...hostel,
    images: images || [],
    amenities: amenities,
  };
}

export async function getFeaturedHostels(limit = 6) {
  const limitNum = validateNumber(limit, 'Limit', 1, 100);

  const { data, error } = await supabase
    .from('hostels')
    .select('*')
    .eq('verified', true)
    .gt('rating', 0)
    .order('rating', { ascending: false })
    .limit(limitNum);

  if (error) {
    throw new Error('Failed to fetch featured hostels');
  }

  return data || [];
}

export async function getHostelsByOwner(ownerId: string) {
  if (!ownerId || typeof ownerId !== 'string') {
    throw new Error('Invalid owner ID');
  }

  const { data, error } = await supabase
    .from('hostels')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch hostels');
  }

  return data || [];
}

export async function createHostel(hostel: Omit<Hostel, 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count'>) {
  validateString(hostel.name, 'Hostel name', 200);
  validateString(hostel.location, 'Location', 200);
  validateString(hostel.city, 'City', 100);
  validateString(hostel.country, 'Country', 100);
  validateNumber(hostel.price_per_night, 'Price per night', 0.01, 10000);
  validateRoomType(hostel.room_type);
  validateNumber(hostel.beds_available, 'Beds available', 1, 1000);
  if (!hostel.owner_id || typeof hostel.owner_id !== 'string') {
    throw new Error('Invalid owner ID');
  }

  const { data, error } = await supabase
    .from('hostels')
    .insert([hostel])
    .select();

  if (error) {
    throw new Error('Failed to create hostel');
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create hostel');
  }

  return data[0];
}

export async function updateHostel(id: string, updates: Partial<Hostel>) {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid hostel ID');
  }

  if (updates.name) validateString(updates.name, 'Hostel name', 200);
  if (updates.location) validateString(updates.location, 'Location', 200);
  if (updates.city) validateString(updates.city, 'City', 100);
  if (updates.country) validateString(updates.country, 'Country', 100);
  if (updates.price_per_night) validateNumber(updates.price_per_night, 'Price per night', 0.01, 10000);
  if (updates.room_type) validateRoomType(updates.room_type);
  if (updates.beds_available) validateNumber(updates.beds_available, 'Beds available', 1, 1000);

  const { data, error } = await supabase
    .from('hostels')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    throw new Error('Failed to update hostel');
  }

  if (!data || data.length === 0) {
    throw new Error('Hostel not found');
  }

  return data[0];
}

export async function deleteHostel(id: string) {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid hostel ID');
  }

  const { error } = await supabase
    .from('hostels')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Failed to delete hostel');
  }
}
