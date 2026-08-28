export function useDateFormat() {
  const formatTime = (time: string | null | undefined): string => {
    if (!time || time.trim() === '') return '-';
    return time.length >= 5 ? time.substring(0, 5) : time;
  };

  const formatDateTime = (date: string | null | undefined): string => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (date: string | null | undefined): string => {
    if (!date) return '-';
    
    const target = new Date(date);
    if (isNaN(target.getTime())) return '-';
    
    const now = new Date();
    const diffMs = now.getTime() - target.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return formatDate(date);
  };

  return {
    formatTime,
    formatDateTime,
    formatDate,
    formatTimeAgo
  };
}