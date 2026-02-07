import { supabase } from './supabase';

export async function getWishlist(userId: string) {
  const { data, error } = await supabase
    .from('wishlists')
    .select('hostel_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((w) => w.hostel_id);
}

export async function addToWishlist(userId: string, hostelId: string) {
  const { error } = await supabase
    .from('wishlists')
    .insert([{ user_id: userId, hostel_id: hostelId }]);

  if (error && error.code !== '23505') throw error;
}

export async function removeFromWishlist(userId: string, hostelId: string) {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('hostel_id', hostelId);

  if (error) throw error;
}

export async function toggleWishlist(userId: string, hostelId: string, isWishlisted: boolean) {
  if (isWishlisted) {
    await removeFromWishlist(userId, hostelId);
  } else {
    await addToWishlist(userId, hostelId);
  }
}
