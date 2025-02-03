import { test, expect } from '@playwright/test';

test.describe('Add Wallet Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the wallet page
    await page.goto('/');
  });

  test('should create a Lightning wallet successfully', async ({ page }) => {
    // Click the add wallet button
    await page.click('button:has(svg[data-lucide="plus"])');
    
    // Wait for dialog to appear
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    
    // Fill in wallet name
    await page.fill('input[placeholder="Wallet name"]', 'Test Lightning Wallet');
    
    // Select Bitcoin wallet type
    await page.click('div:has-text("Simple and powerful Bitcoin wallet")');
    
    // Click create button
    await page.click('button:has-text("Create")');
    
    // Verify dialog is closed
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
    
    // Verify new wallet appears in the list
    await expect(page.locator('text=Test Lightning Wallet')).toBeVisible();
  });

  test('should start multisig vault flow correctly', async ({ page }) => {
    // Open add wallet dialog
    await page.click('button:has(svg[data-lucide="plus"])');
    
    // Wait for dialog
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Fill wallet name
    await page.fill('input[placeholder="Wallet name"]', 'Test Multisig Vault');
    
    // Select Multisig vault type
    await page.click('div:has-text("Best security for large amounts")');
    
    // Debug: Log dialog content before clicking create
    console.log('Dialog content before create:', await dialog.innerHTML());
    
    // Click create button and wait for navigation
    await Promise.all([
      page.click('button:has-text("Create")'),
      // Wait for animation to complete
      page.waitForTimeout(200)
    ]);
    
    // Debug: Log current step
    console.log('Current step after create:', await page.locator('div.font-medium').textContent());
    
    // Verify we're in the multisig flow
    await expect(page.locator('text=A Vault is a 2-of-3 multisig wallet')).toBeVisible();
    
    // Test the complete flow
    // 1. Intro step
    await page.click('button:has-text("Let\'s start")');
    await expect(page.locator('text=Vault Settings')).toBeVisible();
    
    // 2. Quorum step
    await page.click('button:has-text("Create")');
    await expect(page.locator('text=Vault Key 1')).toBeVisible();
    
    // 3. Keys step
    await page.click('button:has-text("Create New")');
    await expect(page.locator('text=Take a moment to safely backup')).toBeVisible();
    
    // 4. Complete step
    await page.click('button:has-text("Next Key")');
    
    // Verify we're back to the keys step for the next key
    await expect(page.locator('text=Vault Key 2')).toBeVisible();
  });

  test('should handle back navigation in multisig flow', async ({ page }) => {
    // Open add wallet dialog and start multisig flow
    await page.click('button:has(svg[data-lucide="plus"])');
    await page.fill('input[placeholder="Wallet name"]', 'Test Multisig Vault');
    await page.click('div:has-text("Best security for large amounts")');
    await page.click('button:has-text("Create")');
    
    // Navigate forward to quorum step
    await page.click('button:has-text("Let\'s start")');
    await expect(page.locator('text=Vault Settings')).toBeVisible();
    
    // Test back navigation
    await page.click('button:has(svg[data-lucide="chevron-left"])');
    await expect(page.locator('text=A Vault is a 2-of-3 multisig wallet')).toBeVisible();
    
    // Navigate back to initial add wallet screen
    await page.click('button:has(svg[data-lucide="chevron-left"])');
    await expect(page.locator('text=Add Wallet')).toBeVisible();
  });

  test('should maintain state during multisig flow', async ({ page }) => {
    // Start multisig flow
    await page.click('button:has(svg[data-lucide="plus"])');
    await page.fill('input[placeholder="Wallet name"]', 'Test Multisig Vault');
    await page.click('div:has-text("Best security for large amounts")');
    await page.click('button:has-text("Create")');
    
    // Complete intro and reach quorum step
    await page.click('button:has-text("Let\'s start")');
    
    // Modify quorum settings
    await page.click('text=▲', { hasText: /^▲$/ }); // Click first up arrow
    await expect(page.locator('text=3').first()).toBeVisible();
    
    // Navigate back and forth
    await page.click('button:has(svg[data-lucide="chevron-left"])');
    await page.click('button:has-text("Let\'s start")');
    
    // Verify quorum settings are maintained
    await expect(page.locator('text=3').first()).toBeVisible();
  });
}); 