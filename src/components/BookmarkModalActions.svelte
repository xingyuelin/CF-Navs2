<script lang="ts">
  export let mode: 'create' | 'edit' = 'create'
  export let bookmarkId: string | number | undefined = undefined
  export let canDelete = false
  export let loading = false
  export let deleting = false
  export let saveDisabled = false
  export let onCancel: (() => void) | undefined = undefined
  export let onDelete: (() => void | Promise<void>) | undefined = undefined
</script>

<div class="modal-actions">
  {#if mode === 'edit' && bookmarkId && canDelete}
    <button type="button" class="danger-button" on:click={onDelete} disabled={loading || deleting}>
      {#if deleting}删除中...{:else}删除{/if}
    </button>
  {/if}
  <button type="button" class="ghost-button" on:click={onCancel} disabled={loading}>取消</button>
  <button type="submit" class="primary-button" disabled={saveDisabled}>
    {#if loading}保存中...{:else}保存{/if}
  </button>
</div>

<style>
  .modal-actions {
    grid-column: 1 / -1;
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin: 0 -14px;
    padding: 7px 14px 9px;
    border-top: 1px solid #e2e8f0;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(10px);
  }

  .primary-button,
  .ghost-button,
  .danger-button {
    border-radius: 10px;
    padding: 7px 12px;
    font-size: 13px;
    cursor: pointer;
    transition: 0.18s ease;
  }

  .primary-button {
    border: none;
    background: #2563eb;
    color: #ffffff;
  }

  .ghost-button {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
  }

  .danger-button {
    margin-right: auto;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #dc2626;
  }

  .primary-button:disabled,
  .ghost-button:disabled,
  .danger-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 500px) {
    .modal-actions {
      margin-right: -14px;
      margin-left: -14px;
      padding-right: 14px;
      padding-left: 14px;
    }
  }
</style>
