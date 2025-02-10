import { test, expect } from '@playwright/test';

test.describe('Profile Modal Account Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home and ensure we're logged in
    await page.goto('/');
    // TODO: Add login steps if needed
  });

  test('should update global state correctly when switching accounts', async ({ page }) => {
    // 1. Initial State Capture
    await test.step('Capture Initial State', async () => {
      // Store initial account state
      const initialState = await page.evaluate(() => ({
        accountName: document.querySelector('[data-testid="header-account-name"]')?.textContent,
        walletList: Array.from(document.querySelectorAll('[data-testid="wallet-list-item"]')).map(el => el.textContent),
        transactionHistory: Array.from(document.querySelectorAll('[data-testid="transaction-item"]')).map(el => el.textContent),
        chatList: Array.from(document.querySelectorAll('[data-testid="chat-list-item"]')).map(el => el.textContent)
      }));
      
      console.log('Initial State:', initialState);
    });

    // 2. Open Profile Modal
    await test.step('Open Profile Modal', async () => {
      await page.click('[data-testid="profile-button"]');
      await expect(page.locator('div[role="dialog"]')).toBeVisible();
      
      // Verify modal content
      await expect(page.locator('[data-testid="profile-modal-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="account-switcher"]')).toBeVisible();
    });

    // 3. Switch Account
    await test.step('Perform Account Switch', async () => {
      // Select different account
      const targetAccount = page.locator('[data-testid="account-option"]').nth(1);
      const targetAccountName = await targetAccount.getAttribute('data-account-name');
      
      // Store pre-switch state for comparison
      const preSwitchState = await page.evaluate(() => ({
        accountName: document.querySelector('[data-testid="header-account-name"]')?.textContent,
        walletList: Array.from(document.querySelectorAll('[data-testid="wallet-list-item"]')).map(el => el.textContent)
      }));

      // Perform switch
      await targetAccount.click();
      
      // Wait for loading state
      await expect(page.locator('[data-testid="account-switching-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="account-switching-indicator"]')).not.toBeVisible();
    });

    // 4. Verify Global State Updates
    await test.step('Verify Global State Updates', async () => {
      // Header Updates
      await expect(page.locator('[data-testid="header-account-name"]')).toHaveText(targetAccountName);
      
      // Profile Updates
      await expect(page.locator('[data-testid="profile-avatar"]')).toHaveAttribute('data-account-id', targetAccountId);
      
      // Wallet List Updates
      const newWalletList = page.locator('[data-testid="wallet-list"]');
      await expect(newWalletList).not.toHaveText(preSwitchState.walletList[0]);
      
      // Transaction History Updates
      await expect(page.locator('[data-testid="transaction-history"]')).not.toHaveText(initialState.transactionHistory[0]);
      
      // Chat Updates
      await expect(page.locator('[data-testid="chat-list"]')).not.toHaveText(initialState.chatList[0]);
      
      // Financial Data Updates
      await expect(page.locator('[data-testid="account-balance"]')).not.toHaveText(preSwitchState.balance);
      
      // Security Context Updates
      const newPermissions = await page.evaluate(() => {
        return document.querySelector('[data-testid="account-permissions"]')?.textContent;
      });
      expect(newPermissions).not.toBe(preSwitchState.permissions);
    });

    // 5. Verify State Persistence
    await test.step('Verify State Persistence', async () => {
      // Refresh page
      await page.reload();
      
      // Verify account selection persists
      await expect(page.locator('[data-testid="header-account-name"]')).toHaveText(targetAccountName);
      
      // Verify all associated data is still correct
      const persistedState = await page.evaluate(() => ({
        accountName: document.querySelector('[data-testid="header-account-name"]')?.textContent,
        walletList: Array.from(document.querySelectorAll('[data-testid="wallet-list-item"]')).map(el => el.textContent),
        transactionHistory: Array.from(document.querySelectorAll('[data-testid="transaction-item"]')).map(el => el.textContent)
      }));
      
      expect(persistedState.accountName).toBe(targetAccountName);
      expect(persistedState.walletList).not.toEqual(preSwitchState.walletList);
    });

    // 6. Verify Chat Context
    await test.step('Verify Chat Context', async () => {
      // Navigate to chat
      await page.click('[data-testid="chat-nav"]');
      
      // Verify chat history is updated
      await expect(page.locator('[data-testid="chat-history"]')).not.toHaveText(initialState.chatHistory);
      
      // Verify unread counts
      const unreadCount = await page.locator('[data-testid="unread-count"]').textContent();
      expect(unreadCount).not.toBe(preSwitchState.unreadCount);
    });
  });

  test('should handle account switch errors gracefully', async ({ page }) => {
    await test.step('Handle Network Error', async () => {
      // Simulate offline state
      await page.route('**/*', route => route.abort());
      
      // Attempt account switch
      await page.click('[data-testid="profile-button"]');
      await page.click('[data-testid="account-option"]').nth(1);
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('network error');
      
      // Verify previous account state is maintained
      await expect(page.locator('[data-testid="header-account-name"]')).toHaveText(initialAccountName);
    });
  });
}); 