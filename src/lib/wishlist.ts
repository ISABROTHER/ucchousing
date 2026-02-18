import { supabase } from './supabase';

export interface WishlistItem {
  id: string;
  user_id: string;
  hostel_id: string;
  created_at: string;
  hostels?: {
    id: string;
    name: string;
    location: string;
    city: string;
    price_per_night: number;
    rating: number;
    review_count: number;
    room_type: string;
    beds_available: number;
    hostel_images?: Array<{ image_url: string; display_order: number }>;
  };
}

export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlists')
    .select(`
      *,
      hostels(
        id, name, location, city, price_per_night, rating, review_count,
        room_type, beds_available,
        hostel_images(image_url, display_order)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addToWishlist(userId: string, hostelId: string): Promise<void> {
  const { error } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, hostel_id: hostelId });

  if (error && error.code !== '23505') throw error;
}

export async function removeFromWishlist(userId: string, hostelId: string): Promise<void> {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('hostel_id', hostelId);

  if (error) throw error;
}

export async function isInWishlist(userId: string, hostelId: string): Promise<boolean> {
  const { data } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('hostel_id', hostelId)
    .maybeSingle();

  return !!data;
}

export async function toggleWishlist(userId: string, hostelId: string): Promise<boolean> {
  const isWishlisted = await isInWishlist(userId, hostelId);
  if (isWishlisted) {
    await removeFromWishlist(userId, hostelId);
    return false;
  } else {
    await addToWishlist(userId, hostelId);
    return true;
  }
}
