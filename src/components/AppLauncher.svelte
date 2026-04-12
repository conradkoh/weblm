<script lang="ts">
  /**
   * AppLauncher — landing page with app launcher.
   *
   * Shows a welcoming hero section and available apps.
   * The Chat card navigates to the model selection screen.
   */

  import { Button } from '$ui/button';
  import * as Card from '$ui/card';
  import { getAppState } from '../stores/appStore.svelte';
  import { setScreen } from '../stores/appStore.svelte';

  const appState = getAppState();

  // App card data
  const apps = [
    {
      id: 'chat',
      icon: '💬',
      name: 'Chat',
      description: 'Local AI conversation — private & fast',
      disabled: false,
    },
    {
      id: 'formatter',
      icon: '📝',
      name: 'Formatter',
      description: 'Format and extract content from large documents',
      disabled: false,
    },
  ] as const;

  function handleAppClick(appId: string): void {
    if (appId === 'chat') {
      setScreen('launcher');
    } else if (appId === 'formatter') {
      setScreen('formatter');
    }
  }
</script>

<div class="flex items-center justify-center min-h-full px-6 py-12">
  <div class="w-full max-w-[600px]">

    <!-- Hero section with gradient background -->
    <div class="relative mb-10 py-10">
      <!-- Subtle gradient backdrop -->
      <div class="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20 dark:to-transparent" aria-hidden="true"></div>
      
      <div class="text-center">
        <div class="text-6xl leading-none mb-4 select-none" aria-hidden="true">🧠</div>
        <h1 class="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">WebLM</h1>
        <p class="text-lg text-gray-500 dark:text-slate-400">
          Run AI models locally in your browser
        </p>
      </div>
    </div>

    <!-- App cards -->
    <div class="flex flex-col gap-4">
      {#each apps as app (app.id)}
        <Card.Root
          class="p-5 transition-all duration-200 ease-out cursor-pointer select-none
            bg-white dark:bg-slate-800/50
            border-gray-200 dark:border-slate-700
            hover:bg-gray-50 dark:hover:bg-slate-800
            hover:border-indigo-300 dark:hover:border-indigo-600
            hover:scale-[1.02] hover:shadow-lg
            active:scale-[0.98]
            focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
            {app.disabled ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-sm' : ''}"
          role="button"
          tabindex={app.disabled ? -1 : 0}
          aria-disabled={app.disabled}
          aria-label="Open {app.name}"
          onclick={() => { if (!app.disabled) handleAppClick(app.id); }}
          onkeydown={(e) => {
            if (!app.disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleAppClick(app.id);
            }
          }}
        >
          <Card.Content class="p-0 flex items-center gap-4">
            <div
              class="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-3xl flex-shrink-0"
              aria-hidden="true"
            >
              {app.icon}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {app.name}
                </h2>
                {#if app.disabled}
                  <span class="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                    Coming soon
                  </span>
                {/if}
              </div>
              <p class="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                {app.description}
              </p>
            </div>
            <div class="text-gray-400 dark:text-slate-600 flex-shrink-0" aria-hidden="true">
              →
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>

    <!-- WebGPU status note -->
    {#if appState.webgpu.available === null}
      <p class="text-center text-sm text-gray-400 dark:text-slate-500 mt-8">
        Checking WebGPU support…
      </p>
    {:else if !appState.webgpu.available}
      <p class="text-center text-sm text-red-500 mt-8">
        WebGPU is not available in this browser
      </p>
    {/if}

    <!-- Footer -->
    <footer class="mt-12 text-center">
      <p class="text-xs text-gray-400 dark:text-slate-600">
        Runs entirely in your browser — no data leaves your device
      </p>
    </footer>

  </div>
</div>
