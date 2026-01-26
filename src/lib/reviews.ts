import { supabase } from './supabase';

export interface Review {
  id: string;
  hostel_id: string;
  student_id: string;
  booking_id?: string;
  rating: number;
  comment?: string;
  is_verified_guest: boolean;
  created_at: string;
  updated_at: string;
}

function validateUUID(value: any, fieldName: string): string {
  if (!value || typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return value;
}

function validateRating(value: any): number {
  const rating = Number(value);
  if (isNaN(rating) || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 1 and 5');
  }
  return rating;
}

export async function getHostelReviews(hostelId: string) {
  validateUUID(hostelId, 'Hostel ID');

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user_profiles:student_id(full_name, avatar_url)
    `)
    .eq('hostel_id', hostelId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch reviews');
  }

  return data || [];
}

export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at'>) {
  validateUUID(review.hostel_id, 'Hostel ID');
  validateUUID(review.student_id, 'Student ID');
  validateRating(review.rating);

  if (review.booking_id) {
    validateUUID(review.booking_id, 'Booking ID');
  }

  if (review.comment && (typeof review.comment !== 'string' || review.comment.length > 2000)) {
    throw new Error('Comment must be a string not exceeding 2000 characters');
  }

  if (typeof review.is_verified_guest !== 'boolean') {
    throw new Error('is_verified_guest must be a boolean');
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert([review])
    .select();

  if (error) {
    throw new Error('Failed to create review');
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create review');
  }

  return data[0];
}

export async function updateReview(reviewId: string, updates: Partial<Review>) {
  validateUUID(reviewId, 'Review ID');

  if (updates.rating) validateRating(updates.rating);
  if (updates.comment && (typeof updates.comment !== 'string' || updates.comment.length > 2000)) {
    throw new Error('Comment must be a string not exceeding 2000 characters');
  }

  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', reviewId)
    .select();

  if (error) {
    throw new Error('Failed to update review');
  }

  if (!data || data.length === 0) {
    throw new Error('Review not found');
  }

  return data[0];
}

export async function deleteReview(reviewId: string) {
  validateUUID(reviewId, 'Review ID');

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    throw new Error('Failed to delete review');
  }
}
