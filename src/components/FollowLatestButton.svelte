<script lang="ts">
  /**
   * FollowLatestButton component.
   * Floating button that appears when user has scrolled away from bottom,
   * allowing them to re-enable auto-follow behavior.
   */
  
  interface Props {
    visible: boolean;
    onclick: () => void;
  }
  
  let { visible, onclick }: Props = $props();
</script>

{#if visible}
  <button
    type="button"
    onclick={onclick}
    class="absolute bottom-3 left-1/2 z-10 px-3 py-1.5 text-xs rounded-full 
           bg-slate-700/90 dark:bg-slate-600/90 text-white shadow-lg
           hover:bg-slate-600 dark:hover:bg-slate-500 transition-all duration-200
           flex items-center gap-1.5 backdrop-blur-sm"
  >
    <span class="inline-block">↓</span>
    <span>Follow latest</span>
  </button>
{/if}

<style>
  button {
    animation: slideUp 0.2s ease-out;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translate(-50%, 10px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
</style>
