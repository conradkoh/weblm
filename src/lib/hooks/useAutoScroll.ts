/**
 * Auto-scroll hook for scrollable containers.
 * Tracks whether user has manually scrolled away from bottom,
 * providing an escape hatch from auto-follow behavior.
 */

interface AutoScrollState {
  isFollowing: boolean;
  scrollToBottom: () => void;
  onScroll: (e: Event) => void;
  checkAndScroll: () => void;
}

// Threshold in pixels for considering "at bottom"
const BOTTOM_THRESHOLD = 20;

/**
 * Create auto-scroll behavior for a container.
 * @param getContainer - Function that returns the container element (may be null initially)
 * @returns Auto-scroll state and handlers
 */
export function useAutoScroll(getContainer: () => HTMLElement | null): AutoScrollState {
  let isFollowing = $state(true);
  
  function isAtBottom(container: HTMLElement): boolean {
    const { scrollTop, clientHeight, scrollHeight } = container;
    return scrollTop + clientHeight >= scrollHeight - BOTTOM_THRESHOLD;
  }
  
  function scrollToBottom(): void {
    const container = getContainer();
    if (!container) return;
    
    isFollowing = true;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }
  
  function onScroll(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target) return;
    
    isFollowing = isAtBottom(target);
  }
  
  // Auto-scroll when following and new content is added
  function checkAndScroll(): void {
    if (!isFollowing) return;
    
    const container = getContainer();
    if (!container) return;
    
    container.scrollTop = container.scrollHeight;
  }
  
  return {
    get isFollowing() { return isFollowing; },
    scrollToBottom,
    onScroll,
    checkAndScroll,
  };
}

/**
 * Debounced scroll handler factory.
 * Helps avoid excessive state updates during scrolling.
 */
export function createDebouncedScrollHandler(
  handler: (e: Event) => void,
  delay: number = 50
): (e: Event) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (e: Event) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      handler(e);
      timeoutId = null;
    }, delay);
  };
}
