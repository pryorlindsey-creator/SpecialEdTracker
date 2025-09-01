import { useState, useEffect } from 'react';

interface ReviewItem {
  id: string;
  type: 'goal' | 'objective';
  itemId: number;
  title: string;
  targetCriteria: string;
  masteryDate: string;
}

export function useMasteryReview(studentId: number) {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

  useEffect(() => {
    const reviewKey = `masteryAlerts_needsReview_${studentId}`;
    const stored = localStorage.getItem(reviewKey);
    if (stored) {
      setReviewItems(JSON.parse(stored));
    }
  }, [studentId]);

  const markAsReviewed = (itemId: number, type: 'goal' | 'objective') => {
    const reviewKey = `masteryAlerts_needsReview_${studentId}`;
    const filtered = reviewItems.filter(item => 
      !(item.itemId === itemId && item.type === type)
    );
    setReviewItems(filtered);
    localStorage.setItem(reviewKey, JSON.stringify(filtered));
  };

  const needsReview = (itemId: number, type: 'goal' | 'objective') => {
    return reviewItems.some(item => 
      item.itemId === itemId && item.type === type
    );
  };

  const getReviewItem = (itemId: number, type: 'goal' | 'objective') => {
    return reviewItems.find(item => 
      item.itemId === itemId && item.type === type
    );
  };

  return {
    reviewItems,
    markAsReviewed,
    needsReview,
    getReviewItem
  };
}