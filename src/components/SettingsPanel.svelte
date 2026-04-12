<script lang="ts">
  /**
   * SettingsPanel component.
   * Modal dialog for adjusting generation parameters, system prompt, theme, and export.
   * Reads from and writes to the settings store.
   */

  import { getSettingsState, applySettings } from '../stores/settingsStore.svelte';
  import { exportChatAsText, exportChatAsMarkdown } from '../app/export';
  import type { ChatMessage } from '../types';
  import type { Theme } from '../stores/types';
  import * as Dialog from '$ui/dialog';
  import { Slider } from '$ui/slider';
  import { Switch } from '$ui/switch';
  import * as RadioGroup from '$ui/radio-group';
  import { Label } from '$ui/label';
  import { Textarea } from '$ui/textarea';
  import { Button } from '$ui/button';
  import { Separator } from '$ui/separator';

  interface Props {
    open: boolean;
    messages: ChatMessage[];
    onClose: () => void;
  }

  let { open, messages, onClose }: Props = $props();

  const settings = getSettingsState();

  // Local copies for editing (avoid mutating store until Save)
  let temperature = $state(settings.temperature);
  let maxTokens = $state(settings.maxTokens);
  let topP = $state(settings.topP);
  let systemPrompt = $state(settings.systemPrompt);
  let theme = $state<Theme>(settings.theme);
  let showMetrics = $state(settings.showMetrics);

  // Re-sync local copies when panel opens
  $effect(() => {
    if (open) {
      temperature = settings.temperature;
      maxTokens = settings.maxTokens;
      topP = settings.topP;
      systemPrompt = settings.systemPrompt;
      theme = settings.theme;
      showMetrics = settings.showMetrics;
    }
  });

  function handleSave(): void {
    applySettings({ temperature, maxTokens, topP, systemPrompt, theme, showMetrics });
    onClose();
  }
</script>

<Dialog.Root
  {open}
  onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
>
  <Dialog.Content class="max-w-[500px] w-[90%] max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
    </Dialog.Header>

    <!-- Content -->
    <div class="flex flex-col gap-6 py-2">

      <!-- Generation Parameters -->
      <div class="flex flex-col gap-3">
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generation</h3>

        <div class="flex flex-col gap-1">
          <Label for="temp-slider">Temperature: {temperature.toFixed(2)}</Label>
          <Slider
            id="temp-slider"
            type="single"
            min={0}
            max={2}
            step={0.05}
            bind:value={temperature}
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label for="tokens-slider">Max Tokens: {maxTokens}</Label>
          <Slider
            id="tokens-slider"
            type="single"
            min={256}
            max={8192}
            step={256}
            bind:value={maxTokens}
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label for="topp-slider">Top-P: {topP.toFixed(2)}</Label>
          <Slider
            id="topp-slider"
            type="single"
            min={0}
            max={1}
            step={0.05}
            bind:value={topP}
            class="w-full"
          />
        </div>
      </div>

      <Separator />

      <!-- System Prompt -->
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Prompt</h3>
        <Label for="system-prompt" class="sr-only">System Prompt</Label>
        <Textarea
          id="system-prompt"
          rows={4}
          placeholder="Enter system prompt..."
          bind:value={systemPrompt}
          class="resize-y min-h-[96px]"
        />
      </div>

      <Separator />

      <!-- Theme -->
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Theme</h3>
        <RadioGroup.Root bind:value={theme} class="flex flex-row gap-4">
          {#each (['light', 'dark', 'system'] as Theme[]) as t (t)}
            <div class="flex items-center gap-2">
              <RadioGroup.Item value={t} id="theme-{t}" />
              <Label for="theme-{t}" class="cursor-pointer capitalize">{t}</Label>
            </div>
          {/each}
        </RadioGroup.Root>
      </div>

      <Separator />

      <!-- Metrics Toggle -->
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance</h3>
        <div class="flex items-center gap-2">
          <Switch id="show-metrics" bind:checked={showMetrics} />
          <Label for="show-metrics" class="cursor-pointer">Show generation metrics</Label>
        </div>
      </div>

      <Separator />

      <!-- Export -->
      <div class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Export Chat</h3>
        <div class="flex gap-2 flex-wrap">
          <Button variant="outline" onclick={() => exportChatAsText(messages)}>
            Export as Text
          </Button>
          <Button variant="outline" onclick={() => exportChatAsMarkdown(messages)}>
            Export as Markdown
          </Button>
        </div>
      </div>

    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={onClose}>Cancel</Button>
      <Button onclick={handleSave}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
