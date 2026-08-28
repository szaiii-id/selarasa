export function useUserInitials() {
  const getInitials = (name: string | null | undefined, fallback: string = '??'): string => {
    if (!name || name.trim() === '') return fallback;
    
    const words = name.trim().split(/\s+/);
    
    const firstInitial = words[0]?.charAt(0) || '';
    const secondInitial = words[1]?.charAt(0) || '';
    
    const initials = (firstInitial + secondInitial).toUpperCase();
    
    return initials || fallback;
  };

  const getAvatarColor = (name: string | null | undefined): string => {
    if (!name || name.trim() === '') return 'bg-disabled/30 text-text-secondary';
    
    const colors: string[] = [
      'bg-primary/10 text-primary',
      'bg-info/10 text-info',
      'bg-success/10 text-success',
      'bg-warning/10 text-warning',
      'bg-error/10 text-error'
    ];
    
    let hash: number = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index: number = Math.abs(hash) % colors.length;
    
    return colors[index]!;
  };

  return {
    getInitials,
    getAvatarColor
  };
}