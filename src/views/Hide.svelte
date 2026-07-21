<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import type { PublicBookmark, PublicCategory } from '../../shared/types'
  import { api, getErrorMessage } from '../lib/api'
  import BookmarkCard from '../components/BookmarkCard.svelte'

  let password = ''
  let loading = false
  let error = ''
  let verified = false
  let categories: PublicCategory[] = []
  let bookmarks: PublicBookmark[] = []
  let verifying = false
  let prefersReducedMotion = false

  onMount(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  })

  function getBookmarksForCategory(categoryId: number): PublicBookmark[] {
    return bookmarks
      .filter((bookmark) => bookmark.category_id === categoryId)
      .sort((a, b) => a.sort - b.sort)
  }

  async function handleVerify() {
    if (!password.trim()) {
      error = '请输入密码'
      return
    }

    verifying = true
    error = ''

    try {
      const result = await api.hide.verify({ password: password.trim() })

      if (result.valid) {
        verified = true
        categories = result.categories
        bookmarks = result.bookmarks
      } else {
        error = '密码错误'
      }
    } catch (e) {
      if (getErrorMessage(e).includes('not configured')) {
        error = '隐藏密码尚未配置，请联系管理员在设置中配置 hide_password。'
      } else {
        error = getErrorMessage(e)
      }
    } finally {
      verifying = false
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleVerify()
    }
  }
</script>

<div class="hide-page" in:fade={{ duration: prefersReducedMotion ? 0 : 260 }}>
  {#if !verified}
    <div class="hide-card">
      <div class="hide-header">
        <h1>隐藏分类</h1>
        <p>请输入密码以查看隐藏的分类和书签。</p>
      </div>

      <div class="hide-form">
        <label class="hide-password-label" for="hide-password">
          <span>密码</span>
          <input
            id="hide-password"
            type="password"
            bind:value={password}
            placeholder="输入隐藏页面密码"
            disabled={verifying}
            on:keydown={handleKeyDown}
          />
        </label>

        {#if error}
          <p class="hide-error">{error}</p>
        {/if}

        <button
          class="hide-submit"
          type="button"
          on:click={handleVerify}
          disabled={verifying || !password.trim()}
        >
          {#if verifying}验证中...{:else}验证{/if}
        </button>
      </div>
    </div>
  {:else}
    <div class="hide-content">
      <div class="hide-content-header">
        <h1>隐藏分类</h1>
        <p>以下为隐藏的分类及其包含的书签。</p>
      </div>

      {#if categories.length === 0}
        <div class="hide-empty">
          <p>暂无隐藏的分类。</p>
        </div>
      {:else}
        {#each categories as category (category.id)}
          <section class="hide-category-section">
            <h2 class="hide-category-title">
              {#if category.icon}
                <span class="hide-category-icon">{category.icon}</span>
              {/if}
              {category.title}
            </h2>

            {#if getBookmarksForCategory(category.id).length === 0}
              <p class="hide-empty-category">此分类下暂无书签。</p>
            {:else}
              <div class="hide-bookmarks-grid">
                {#each getBookmarksForCategory(category.id) as bookmark (bookmark.id)}
                  <BookmarkCard {bookmark} />
                {/each}
              </div>
            {/if}
          </section>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .hide-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  }

  .hide-card {
    width: min(100%, 400px);
    background: rgba(30, 41, 59, 0.9);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
  }

  .hide-header {
    text-align: center;
    margin-bottom: 28px;
  }

  .hide-header h1 {
    margin: 0 0 8px;
    font-size: 24px;
    color: #f1f5f9;
  }

  .hide-header p {
    margin: 0;
    font-size: 14px;
    color: #94a3b8;
  }

  .hide-form {
    display: grid;
    gap: 16px;
  }

  .hide-password-label {
    display: grid;
    gap: 8px;
    color: #cbd5e1;
    font-size: 14px;
  }

  .hide-password-label input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.6);
    color: #f1f5f9;
    font-size: 15px;
  }

  .hide-password-label input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .hide-password-label input::placeholder {
    color: #64748b;
  }

  .hide-error {
    margin: 0;
    color: #f87171;
    font-size: 13px;
    text-align: center;
  }

  .hide-submit {
    border: none;
    border-radius: 12px;
    padding: 12px 20px;
    background: #3b82f6;
    color: #ffffff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s ease;
  }

  .hide-submit:hover:not(:disabled) {
    background: #2563eb;
  }

  .hide-submit:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Content view */
  .hide-content {
    width: min(100%, 1200px);
    padding: 40px 20px;
    margin: 0 auto;
  }

  .hide-content-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .hide-content-header h1 {
    margin: 0 0 8px;
    font-size: 28px;
    color: #f1f5f9;
  }

  .hide-content-header p {
    margin: 0;
    font-size: 14px;
    color: #94a3b8;
  }

  .hide-empty {
    text-align: center;
    padding: 60px 20px;
    color: #94a3b8;
  }

  .hide-category-section {
    margin-bottom: 36px;
  }

  .hide-category-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 16px;
    font-size: 20px;
    color: #e2e8f0;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .hide-category-icon {
    font-size: 22px;
  }

  .hide-empty-category {
    color: #64748b;
    font-size: 14px;
    padding: 16px 0;
  }

  .hide-bookmarks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  @media (max-width: 640px) {
    .hide-card {
      padding: 24px 20px;
    }

    .hide-content {
      padding: 24px 16px;
    }

    .hide-bookmarks-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
  }
</style>
